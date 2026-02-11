const os = require("os");

function runtime(seconds) {
    const total = Math.max(0, Math.floor(Number(seconds) || 0));
    const d = Math.floor(total / 86400);
    const h = Math.floor((total % 86400) / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return `${d}d ${h}h ${m}m ${s}s`;
}

function formatMb(bytes) {
    return `${(bytes / 1024 / 1024).toFixed(2)}MB`;
}

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

            const text = [
                "🏷️ *SYSTEM STATUS*",
                "",
                `🔄 *UPTIME:* ${uptime}`,
                `🔋 *RAM USAGE:* ${formatMb(heapUsed)} / ${formatMb(totalMem)}`,
                `💻 *HOST NAME:* ${os.hostname()}`,
                `👑 *BOT OWNER:* ${owner}`,
                "",
                '> *Mantra*'
            ].join("\n");

            await m.reply(text);
        } catch (e) {
            console.error("system error:", e?.message || e);
            await m.reply("Failed to fetch system status.");
        }
    }
};
