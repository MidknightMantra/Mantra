module.exports = {
    name: "mode",
    react: "🔒",
    category: "owner",
    description: "Switch bot between public and private mode",
    usage: ",mode public|private",
    aliases: ["botmode", "setmode"],

    execute: async (_sock, m, mantra) => {
        if (!m.isOwner) {
            await m.reply("Owner only command.");
            return;
        }

        const sub = String(m.args?.[0] || "").trim().toLowerCase();
        const current = mantra.settings.mode || "public";

        if (!sub) {
            await m.reply(
                `🔒 *Bot Mode*\n\n` +
                `• Current: *${current}*\n\n` +
                `Modes:\n` +
                `• ${m.prefix}mode public — anyone can use commands\n` +
                `• ${m.prefix}mode private — only owner/sudo can use commands`
            );
            return;
        }

        if (!["public", "private"].includes(sub)) {
            return m.reply(`Usage: ${m.prefix}mode public|private`);
        }

        mantra.settings.mode = sub;
        mantra.saveSettings();

        const icons = { public: "🌐", private: "🔒" };
        await m.reply(`${icons[sub]} Bot mode set to *${sub}*`);
    }
};
