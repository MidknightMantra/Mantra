const { getGroupAdminState, mentionTag } = require("../lib/groupTools");
const { getGroupSetting, setGroupSetting } = require("../lib/groupSettings");

const MODE_KEY = "ANTILINK";
const LINK_PATTERN = /(https?:\/\/|www\.|chat\.whatsapp\.com\/|t\.me\/|discord\.gg\/)/i;

module.exports = {
    name: "antilink",
    react: "🔗",
    category: "group",
    description: "Delete messages containing links in groups",
    usage: ",antilink on|off",
    aliases: ["antilinks", "linkguard"],

    execute: async (sock, m) => {
        const state = await getGroupAdminState(sock, m);
        if (!state.ok) return m.reply(state.error);
        if (!state.senderIsAdmin && !m.isOwner) return m.reply("Admin/owner only command.");

        const arg = String(m.args?.[0] || "").trim().toLowerCase();
        const current = Boolean(getGroupSetting(m.from, MODE_KEY, false));

        if (!arg) {
            await m.reply(`AntiLink is ${current ? "ON" : "OFF"}\nUsage: ${m.prefix}antilink on|off`);
            return;
        }

        if (!["on", "off"].includes(arg)) {
            await m.reply(`Usage: ${m.prefix}antilink on|off`);
            return;
        }

        setGroupSetting(m.from, MODE_KEY, arg === "on");
        await m.reply(`AntiLink is now ${arg.toUpperCase()}`);
    },

    onMessage: async (sock, m) => {
        try {
            if (!m.isGroup) return;
            if (m.key?.fromMe) return;
            if (!Boolean(getGroupSetting(m.from, MODE_KEY, false))) return;

            const text = String(m.body || "").trim();
            if (!text || !LINK_PATTERN.test(text)) return;

            const state = await getGroupAdminState(sock, m);
            if (!state.ok) return;
            if (state.senderIsAdmin || m.isOwner) return;

            try {
                await sock.sendMessage(m.from, { delete: m.key });
            } catch {}

            await sock.sendMessage(m.from, {
                text: `Link removed: ${mentionTag(state.senderJid)}`,
                mentions: [state.senderJid]
            });
        } catch (e) {
            console.error("antilink onMessage error:", e?.message || e);
        }
    }
};
