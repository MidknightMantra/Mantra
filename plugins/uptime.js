module.exports = {
    name: "uptime",
    category: "general",
    description: "Check bot uptime status",
    usage: ",uptime",
    aliases: ["up"],

    execute: async (sock, m) => {
        const uptimeMs = process.uptime() * 1000;
        const seconds = Math.floor((uptimeMs / 1000) % 60);
        const minutes = Math.floor((uptimeMs / (1000 * 60)) % 60);
        const hours = Math.floor((uptimeMs / (1000 * 60 * 60)) % 24);
        const days = Math.floor(uptimeMs / (1000 * 60 * 60 * 24));

        await m.reply(`⏱ : ${days}d ${hours}h ${minutes}m ${seconds}s\n> Mantra`);
    }
};
