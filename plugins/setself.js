module.exports = {
    name: "setself",
    react: "⚙️",
    category: "owner",
    description: "Set the bot's saved-messages/self chat target to this chat",
    usage: ",setself (run inside your saved messages chat)",
    aliases: ["setsaved", "selfjid"],

    execute: async (_sock, m, mantra) => {
        if (!m.isOwner) {
            await m.reply("Owner only command.");
            return;
        }

        const jid = String(m.from || "").trim();
        if (!jid) {
            await m.reply("Could not read current chat id.");
            return;
        }

        mantra.settings.selfjid = jid;
        mantra.saveSettings();
        await m.reply(`Self target set: ${jid}`);
    }
};

