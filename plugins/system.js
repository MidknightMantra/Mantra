const os = require("os");

function runtime(seconds) {
    const total = Math.max(0, Math.floor(Number(seconds) || 0));
    const d = Math.floor(total / 86400);
    const h = Math.floor((total % 86400) / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const parts = [];
    if (d) parts.push(`${d}d`);
    if (h) parts.push(`${h}h`);
    if (m) parts.push(`${m}m`);
    parts.push(`${s}s`);
    return parts.join(" ");
}

function formatMb(bytes) {
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
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
