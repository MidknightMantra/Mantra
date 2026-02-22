module.exports = {
    name: "restart",
    react: "💢",
    category: "owner",
    description: "Restart the bot process",
    usage: ",restart",
    aliases: ["reboot"],

    execute: async (_sock, m) => {
        try {
            if (!m.isOwner) {
                await m.reply("Owner only command.");
                return;
            }

            await m.reply("Restarting MANTRA...");
            setTimeout(() => process.exit(0), 1500);
        } catch (e) {
            console.error("restart command error:", e?.message || e);
            await m.reply(`${e?.message || e}`);
        }
    }
};
