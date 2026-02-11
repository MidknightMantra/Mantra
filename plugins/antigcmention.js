const { getGroupAdminState, mentionTag } = require("../lib/groupTools");
const {
    getGroupSetting,
    setGroupSetting,
    getGroupCounter,
    incrementGroupCounter,
    setGroupCounter
} = require("../lib/groupSettings");

const MODE_KEY = "ANTIGROUPMENTION";
const WARN_LIMIT_KEY = "ANTIGROUPMENTION_WARN_COUNT";
const WARN_BUCKET = "antigroupmention_warn";

function unwrapFutureProof(node) {
    let current = node;
    let guard = 0;
    while (current && guard < 10) {
        guard += 1;
        if (current?.message && typeof current.message === "object") {
            current = current.message;
            continue;
        }
        break;
    }
    return current;
}

function hasGroupStatusMention(rawMessage, rawPacket, groupId) {
    const message = unwrapFutureProof(rawMessage || {});
    if (message?.groupStatusMentionMessage) return true;

    const mentions = Array.isArray(rawPacket?.statusMentions) ? rawPacket.statusMentions : [];
    if (mentions.some((jid) => String(jid || "").endsWith("@g.us"))) return true;

    const groupMentions = Array.isArray(rawMessage?.groupMentions)
        ? rawMessage.groupMentions
        : Array.isArray(rawPacket?.messageContextInfo?.groupMentions)
            ? rawPacket.messageContextInfo.groupMentions
            : [];

    return groupMentions.some((g) => String(g?.groupJid || "").toLowerCase() === String(groupId || "").toLowerCase());
}

function getMode(groupId) {
    const raw = String(getGroupSetting(groupId, MODE_KEY, "false") || "false").toLowerCase();
    if (["on", "true", "warn"].includes(raw)) return "warn";
    if (raw === "delete") return "delete";
    if (raw === "kick") return "kick";
    return "off";
}

function getWarnLimit(groupId) {
    const raw = Number(getGroupSetting(groupId, WARN_LIMIT_KEY, 3));
    if (!Number.isFinite(raw)) return 3;
    return Math.max(1, Math.min(50, Math.floor(raw)));
}

module.exports = {
    name: "antigcmention",
    react: "🛡️",
    category: "group",
    description: "Toggle anti-group-mention protection (warn/delete/kick/off)",
    usage: ",antigcmention on|warn|delete|kick|off",
    aliases: ["agcm", "antigroupmention", "antistatusmention", "antigcstatusmention"],

    execute: async (sock, m) => {
        try {
            const state = await getGroupAdminState(sock, m);
            if (!state.ok) return m.reply(state.error);
            if (!state.botIsAdmin) return m.reply("Bot must be an admin to use this command.");
            if (!state.senderIsAdmin) return m.reply("You must be an admin to use this command.");

            const arg = String(m.args?.[0] || "").trim().toLowerCase();
            const currentMode = getMode(m.from);
            const currentLimit = getWarnLimit(m.from);

            if (!arg) {
                await m.reply(
                    `🛡️ *Anti-Group-Mention Status*\n\nCurrent: *${currentMode.toUpperCase()}*\nWarn Limit: *${currentLimit}*\n\nUsage:\n• ,antigcmention on\n• ,antigcmention warn\n• ,antigcmention delete\n• ,antigcmention kick\n• ,antigcmention off`
                );
                return;
            }

            let mode = "off";
            if (["on", "true", "warn"].includes(arg)) mode = "warn";
            else if (arg === "delete") mode = "delete";
            else if (arg === "kick") mode = "kick";
            else if (["off", "false"].includes(arg)) mode = "off";
            else {
                await m.reply("Invalid option. Use: on, warn, delete, kick, or off.");
                return;
            }

            setGroupSetting(m.from, MODE_KEY, mode === "off" ? "false" : mode);
            await m.reply(`✅ Anti-Group-Mention is now *${mode.toUpperCase()}*.`);
        } catch (e) {
            console.error("antigcmention execute error:", e?.message || e);
            await m.reply(`${e?.message || e}`);
        }
    },

    onMessage: async (sock, m) => {
        try {
            if (!m.isGroup) return;
            if (m.key?.fromMe) return;

            const mode = getMode(m.from);
            if (mode === "off") return;
            if (!hasGroupStatusMention(m.message, m.raw, m.from)) return;

            const state = await getGroupAdminState(sock, m);
            if (!state.ok) return;
            if (state.senderIsAdmin || state.senderIsSuperAdmin) return;
            if (!state.botIsAdmin) return;
            if (state.senderJid === state.botJid) return;

            try {
                await sock.sendMessage(m.from, { delete: m.key });
            } catch {}

            if (mode === "kick") {
                try {
                    await sock.groupParticipantsUpdate(m.from, [state.senderJid], "remove");
                    await sock.sendMessage(m.from, {
                        text: `🚫 ${mentionTag(state.senderJid)} removed for status group mention.`,
                        mentions: [state.senderJid]
                    });
                } catch (e) {
                    console.error("antigcmention kick error:", e?.message || e);
                }
                return;
            }

            if (mode === "delete") {
                await sock.sendMessage(m.from, {
                    text: `⚠️ ${mentionTag(state.senderJid)} group status mentions are blocked in this group.`,
                    mentions: [state.senderJid]
                });
                return;
            }

            const warnLimit = getWarnLimit(m.from);
            const warns = incrementGroupCounter(m.from, WARN_BUCKET, state.senderJid, 1);
            const remaining = Math.max(0, warnLimit - warns);

            if (warns >= warnLimit) {
                setGroupCounter(m.from, WARN_BUCKET, state.senderJid, 0);
                try {
                    await sock.groupParticipantsUpdate(m.from, [state.senderJid], "remove");
                    await sock.sendMessage(m.from, {
                        text: `🚫 ${mentionTag(state.senderJid)} removed after reaching anti-group-mention warn limit (${warnLimit}).`,
                        mentions: [state.senderJid]
                    });
                } catch (e) {
                    console.error("antigcmention warn->kick error:", e?.message || e);
                }
                return;
            }

            await sock.sendMessage(m.from, {
                text: `⚠️ ${mentionTag(state.senderJid)} warning ${warns}/${warnLimit}. Group status mentions are not allowed here. Remaining: ${remaining}.`,
                mentions: [state.senderJid]
            });
        } catch (e) {
            console.error("antigcmention onMessage error:", e?.message || e);
        }
    }
};