const os = require("os");

function formatUptime(seconds) {
    const total = Math.max(0, Math.floor(Number(seconds || 0)));
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
    return `${(Number(bytes || 0) / 1024 / 1024).toFixed(1)} MB`;
}

module.exports = {
    name: "health",
    react: "🩺",
    category: "main",
    description: "Show runtime health metrics",
    usage: ",health",
    aliases: ["diag", "metrics"],

    execute: async (_sock, m, mantra) => {
        const mem = process.memoryUsage();
        const reconnectAttempts =
            typeof mantra?.getReconnectAttempts === "function" ? mantra.getReconnectAttempts() : 0;
        const avgMs = Number(mantra?.metrics?.averageCommandResponseMs || 0).toFixed(1);
        const totalMeasured = Number(mantra?.metrics?.totalCommandsMeasured || 0);
        const msgCacheSize = Number(mantra?.messageStore?.size || 0);
        const botName = process.env.BOT_NAME || "MANTRA";

        const autoreact = mantra?.settings?.autoreact || { enabled: false, emoji: "✅" };
        const autostatusreact = mantra?.settings?.autostatusreact || { enabled: false, emoji: "❤️" };

        const text = [
            `╭─ 🩺 *Health Check* ─`,
            `│`,
            `│  ⏱ Uptime: *${formatUptime(process.uptime())}*`,
            `│  📦 Node: ${process.version}`,
            `│  🖥 Platform: ${os.platform()} ${os.release()}`,
            `│  🏷 Host: ${os.hostname()}`,
            `│`,
            `├── *Memory*`,
            `│  Heap: ${formatMb(mem.heapUsed)} / ${formatMb(mem.heapTotal)}`,
            `│  RSS: ${formatMb(mem.rss)}`,
            `│`,
            `├── *Performance*`,
            `│  Avg Response: ${avgMs}ms _(${totalMeasured} samples)_`,
            `│  Reconnects: ${reconnectAttempts}`,
            `│  Msg Cache: ${msgCacheSize}`,
            `│`,
            `├── *Auto Features*`,
            `│  Status View: ${mantra?.settings?.autostatusview ? "ON" : "OFF"}`,
            `│  Status React: ${autostatusreact?.enabled ? `ON (${autostatusreact.emoji || "❤️"})` : "OFF"}`,
            `│  Auto Bio: ${mantra?.settings?.autobio ? "ON" : "OFF"}`,
            `│  Auto React: ${autoreact?.enabled ? `ON (${autoreact.emoji || "✅"})` : "OFF"}`,
            `│  Timezone: ${String(mantra?.settings?.timezone || "UTC")}`,
            `│`,
            `╰──────────────`,
            ``,
            `> *${botName}*`
        ].join("\n");

        await m.reply(text);
    }
};
