module.exports = {
    name: "shutdown",
    react: "🛑",
    category: "owner",
    description: "Shutdown the bot process",
    usage: ",shutdown",
    aliases: ["off", "stopbot"],

    execute: async (_sock, m) => {
        if (!m.isOwner) {
            await m.reply("You are not the owner.");
            return;
        }

        await m.reply("Shutting down...");
        setTimeout(() => process.exit(0), 500);
    }
};
