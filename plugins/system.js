const os = require("os");
const { runtime, formatMb } = require("../lib/helper");

module.exports = {
    name: "system",
    react: "🖥️",
    category: "main",
    description: "Check uptime, RAM and host status",
    usage: ",system",
    aliases: ["status", "botinfo"],

    execute: async (_sock, m) => {
        try {
            const uptime = runtime(process.uptime());
            const heapUsed = process.memoryUsage().heapUsed;
            const totalMem = os.totalmem();
            const owner = process.env.BOT_OWNER || "MidknightMantra";
            const botName = process.env.BOT_NAME || "MANTRA";

            const text = [
                `╭─ 🖥️ *System Status* ─`,
                `│`,
                `│  ⏱ Uptime: *${uptime}*`,
                `│  💾 RAM: ${formatMb(heapUsed)} / ${formatMb(totalMem)}`,
                `│  🏷 Host: ${os.hostname()}`,
                `│  👤 Owner: ${owner}`,
                `│`,
                `╰──────────────`,
                ``,
                `> *${botName}*`
            ].join("\n");

            await m.reply(text);
        } catch (e) {
            console.error("system error:", e?.message || e);
            await m.reply("Failed to fetch system status.");
        }
    }
};
