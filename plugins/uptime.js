module.exports = {
    name: "uptime",
    react: "⏱️",
    category: "main",
    description: "Check bot uptime status",
    usage: ",uptime",
    aliases: ["up", "runtime"],

    execute: async (_sock, m) => {
        const uptimeMs = process.uptime() * 1000;
        const seconds = Math.floor((uptimeMs / 1000) % 60);
        const minutes = Math.floor((uptimeMs / (1000 * 60)) % 60);
        const hours = Math.floor((uptimeMs / (1000 * 60 * 60)) % 24);
        const days = Math.floor(uptimeMs / (1000 * 60 * 60 * 24));

        await m.reply(`⏱️ Uptime: ${days}d ${hours}h ${minutes}m ${seconds}s\n> Mantra`);
    }
};
