const { getGroupAdminState, normalizeJid, mentionTag, isSuperAdminParticipant } = require("../lib/groupTools");
const { getGroupSetting, setGroupSetting } = require("../lib/groupSettings");

const SETTING_KEY = "ANTIPROMOTE";
const PROMOTE_STUB = 29;

function isEnabled(groupId) {
    return String(getGroupSetting(groupId, SETTING_KEY, "false")).toLowerCase() === "true";
}

module.exports = {
    name: "antipromote",
    react: "🛡️",
    category: "group",
    description: "Toggle anti-promote protection",
    usage: ",antipromote on|off",
    aliases: [],

    execute: async (sock, m) => {
        try {
            const state = await getGroupAdminState(sock, m);
            if (!state.ok) return m.reply(state.error);
            if (!state.botIsAdmin) return m.reply("Bot must be an admin to use this command.");
            if (!state.senderIsAdmin) return m.reply("You must be an admin to use this command.");

            const action = String(m.args?.[0] || "").trim().toLowerCase();
            const current = isEnabled(m.from);
            if (!["on", "off"].includes(action)) {
                await m.reply(
                    `🛡️ Anti-Promote is currently ${current ? "*ON*" : "*OFF*"}.\nUsage: ,antipromote on|off`
                );
                return;
            }

            const next = action === "on";
            setGroupSetting(m.from, SETTING_KEY, next ? "true" : "false");
            await m.reply(`✅ Anti-Promote is now ${next ? "*ON*" : "*OFF*"} for this group.`);
        } catch (e) {
            console.error("antipromote execute error:", e?.message || e);
            await m.reply(`${e?.message || e}`);
        }
    },

    onMessage: async (sock, m) => {
        try {
            if (!m.isGroup) return;
            if (m.key?.fromMe) return;
            if (!isEnabled(m.from)) return;
            if (Number(m.raw?.messageStubType) !== PROMOTE_STUB) return;

            const state = await getGroupAdminState(sock, m);
            if (!state.ok || !state.botIsAdmin) return;

            const actor = normalizeJid(m.raw?.participant || m.sender);
            if (!actor || actor === state.botJid) return;

            const actorEntry = state.byJid.get(actor);
            if (!actorEntry || isSuperAdminParticipant(actorEntry)) return;

            const targets = Array.isArray(m.raw?.messageStubParameters)
                ? m.raw.messageStubParameters.map((jid) => normalizeJid(jid)).filter(Boolean)
                : [];

            const demoteSet = new Set([actor]);
            for (const target of targets) {
                if (!target || target === state.botJid) continue;
                const entry = state.byJid.get(target);
                if (!entry) continue;
                if (isSuperAdminParticipant(entry)) continue;
                demoteSet.add(target);
            }

            const usersToDemote = Array.from(demoteSet);
            if (!usersToDemote.length) return;

            await sock.groupParticipantsUpdate(m.from, usersToDemote, "demote");
            await sock.sendMessage(m.from, {
                text: `🛡️ Anti-Promote triggered.\n${usersToDemote.map((jid) => mentionTag(jid)).join(", ")} demoted.`,
                mentions: usersToDemote
            });
        } catch (e) {
            console.error("antipromote onMessage error:", e?.message || e);
        }
    }
};

