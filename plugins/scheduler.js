const { normalizeJid } = require("../lib/groupTools");

const MAX_DELAY_MS = 7 * 24 * 60 * 60 * 1000;
let nextTaskId = 1;

function parseDelayToken(token) {
    const raw = String(token || "").trim().toLowerCase();
    if (!raw) return null;

    const match = raw.match(/^(\d+)([smhd])?$/i);
    if (!match) return null;

    const amount = Number(match[1]);
    if (!Number.isFinite(amount) || amount <= 0) return null;

    const unit = String(match[2] || "m").toLowerCase();
    const multipliers = {
        s: 1000,
        m: 60 * 1000,
        h: 60 * 60 * 1000,
        d: 24 * 60 * 60 * 1000
    };

    return amount * multipliers[unit];
}

function formatDelay(ms) {
    const totalSeconds = Math.max(1, Math.ceil(ms / 1000));
    const d = Math.floor(totalSeconds / 86400);
    const h = Math.floor((totalSeconds % 86400) / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    const out = [];
    if (d) out.push(`${d}d`);
    if (h) out.push(`${h}h`);
    if (m) out.push(`${m}m`);
    if (s && out.length < 2) out.push(`${s}s`);
    return out.join(" ");
}

module.exports = {
    name: "schedule",
    react: "⏰",
    category: "main",
    description: "Schedule a message or reminder after a delay",
    usage: ",schedule <10m|1h|1d> <message> | ,remind <10m|1h> <message>",
    aliases: ["remind"],

    execute: async (sock, m) => {
        const command = String(m.command || "").toLowerCase();
        const delayToken = String(m.args?.[0] || "").trim();
        const delayMs = parseDelayToken(delayToken);
        const text = String(m.args?.slice(1).join(" ") || "").trim();

        if (!delayMs || !text) {
            await m.reply(
                `Usage:\n` +
                `• ${m.prefix}schedule <10m|1h|1d> <message>\n` +
                `• ${m.prefix}remind <10m|1h|1d> <message>`
            );
            return;
        }

        if (delayMs > MAX_DELAY_MS) {
            await m.reply("Maximum schedule delay is 7 days.");
            return;
        }

        const destination = command === "remind" ? normalizeJid(m.sender) : m.from;
        if (!destination) {
            await m.reply("Could not resolve destination chat.");
            return;
        }

        const taskId = nextTaskId++;
        setTimeout(async () => {
            try {
                const prefix = command === "remind" ? "Reminder" : "Scheduled message";
                await sock.sendMessage(destination, {
                    text: `${prefix} (#${taskId})\n\n${text}`
                });
            } catch (err) {
                console.error("schedule send error:", err?.message || err);
            }
        }, delayMs);

        await m.reply(
            `${command === "remind" ? "Reminder" : "Message"} scheduled (#${taskId}) for ${formatDelay(delayMs)}.\n` +
            `Note: scheduled tasks are cleared if the bot restarts.`
        );
    }
};
