module.exports = {
    name: "chatbot",
    react: "🤖",
    category: "owner",
    description: "Toggle chatbot auto-reply mode (AI replies without command prefix)",
    usage: ",chatbot on|off|dm|group|all",
    aliases: ["autochat", "autoai", "chatmode"],

    execute: async (_sock, m, mantra) => {
        if (!m.isOwner) {
            await m.reply("Owner only command.");
            return;
        }

        const sub = String(m.args?.[0] || "").trim().toLowerCase();
        const config = mantra.settings.chatbot || { enabled: false, mode: "dm" };

        if (!sub) {
            await m.reply(
                `🤖 *Chatbot Auto-Reply*\n\n` +
                `• Status: ${config.enabled ? "✅ ON" : "❌ OFF"}\n` +
                `• Mode: *${config.mode || "dm"}*\n\n` +
                `Modes:\n` +
                `• ${m.prefix}chatbot dm — reply in DMs only\n` +
                `• ${m.prefix}chatbot group — reply in groups only\n` +
                `• ${m.prefix}chatbot all — reply everywhere\n` +
                `• ${m.prefix}chatbot off — disable`
            );
            return;
        }

        if (sub === "off") {
            mantra.settings.chatbot = { enabled: false, mode: config.mode };
            mantra.saveSettings();
            return m.reply("🤖 Chatbot auto-reply is now ❌ OFF");
        }

        if (["on", "dm", "group", "all"].includes(sub)) {
            const mode = sub === "on" ? (config.mode || "dm") : sub;
            mantra.settings.chatbot = { enabled: true, mode };
            mantra.saveSettings();
            return m.reply(`🤖 Chatbot auto-reply is now ✅ ON\nMode: *${mode}*`);
        }

        await m.reply(`Usage: ${m.prefix}chatbot on|off|dm|group|all`);
    }
};
