const { getGroupAdminState, mentionTag } = require("../lib/groupTools");
const { getGroupSetting, setGroupSetting } = require("../lib/groupSettings");

const MODE_KEY = "ANTIBOT";
const BOT_SPAM_PATTERN = /^(?:[.!/#$%&?])[a-z0-9_]{2,24}\b/i;

module.exports = {
    name: "antibot",
    react: "🤖",
    category: "group",
    description: "Block obvious third-party bot command spam",
    usage: ",antibot on|off",
    aliases: ["botguard"],

    execute: async (sock, m) => {
        const state = await getGroupAdminState(sock, m);
        if (!state.ok) return m.reply(state.error);
        if (!state.senderIsAdmin && !m.isOwner) return m.reply("Admin/owner only command.");

        const arg = String(m.args?.[0] || "").trim().toLowerCase();
        const current = Boolean(getGroupSetting(m.from, MODE_KEY, false));

        if (!arg) {
            await m.reply(`AntiBot is ${current ? "ON" : "OFF"}\nUsage: ${m.prefix}antibot on|off`);
            return;
        }

        if (!["on", "off"].includes(arg)) {
            await m.reply(`Usage: ${m.prefix}antibot on|off`);
            return;
        }

        setGroupSetting(m.from, MODE_KEY, arg === "on");
        await m.reply(`AntiBot is now ${arg.toUpperCase()}`);
    },

    onMessage: async (sock, m) => {
        try {
            if (!m.isGroup) return;
            if (m.key?.fromMe) return;
            if (!Boolean(getGroupSetting(m.from, MODE_KEY, false))) return;

            const text = String(m.body || "").trim();
            if (!text || !BOT_SPAM_PATTERN.test(text)) return;
            if (text.startsWith(String(m.prefix || ","))) return;

            const state = await getGroupAdminState(sock, m);
            if (!state.ok) return;
            if (state.senderIsAdmin || m.isOwner) return;

            try {
                await sock.sendMessage(m.from, { delete: m.key });
            } catch {}

            await sock.sendMessage(m.from, {
                text: `Bot-like command blocked: ${mentionTag(state.senderJid)}`,
                mentions: [state.senderJid]
            });
        } catch (e) {
            console.error("antibot onMessage error:", e?.message || e);
        }
    }
};
