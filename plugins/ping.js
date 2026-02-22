module.exports = {
    name: "ping",
    react: "⚡",
    category: "general",
    description: "Check bot response speed",
    usage: ",ping",
    aliases: ["pi", "p"],

    execute: async (sock, m) => {
        const startTime = process.hrtime();
        await m.reply("Pong!");
        const elapsed = process.hrtime(startTime);
        const responseTime = Math.max(
            1,
            Math.floor(elapsed[0] * 1000 + elapsed[1] / 1_000_000)
        );

        await m.reply(`⚡ Latency: ${responseTime}ms\n> Mantra`);
    }
};
