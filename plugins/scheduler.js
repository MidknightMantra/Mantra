const fs = require("fs");
const path = require("path");
const { normalizeJid } = require("../lib/groupTools");
const { runtime } = require("../lib/helper");

const MAX_DELAY_MS = 7 * 24 * 60 * 60 * 1000;
const SCHEDULE_FILE = path.resolve("./scheduled-tasks.json");
const activeTasks = new Map();
let nextTaskId = 1;

function loadScheduledTasks() {
    try {
        if (!fs.existsSync(SCHEDULE_FILE)) return [];
        const data = JSON.parse(fs.readFileSync(SCHEDULE_FILE, "utf8"));
        return Array.isArray(data) ? data : [];
    } catch {
        return [];
    }
}

function saveScheduledTasks() {
    const tasks = [];
    for (const [id, task] of activeTasks) {
        tasks.push({
            id,
            destination: task.destination,
            text: task.text,
            fireAt: task.fireAt,
            command: task.command,
            sender: task.sender
        });
    }
    fs.writeFileSync(SCHEDULE_FILE, JSON.stringify(tasks, null, 2));
}

function scheduleTask(sock, task) {
    const remaining = task.fireAt - Date.now();
    if (remaining <= 0) {
        activeTasks.delete(task.id);
        saveScheduledTasks();
        return;
    }

    const timer = setTimeout(async () => {
        try {
            const prefix = task.command === "remind" ? "Reminder" : "Scheduled message";
            await sock.sendMessage(task.destination, {
                text: `⏰ ${prefix} (#${task.id})\n\n${task.text}`
            });
        } catch (err) {
            console.error("schedule send error:", err?.message || err);
        }
        activeTasks.delete(task.id);
        saveScheduledTasks();
    }, Math.min(remaining, 2147483647));

    task.timer = timer;
    activeTasks.set(task.id, task);
}

function restoreScheduledTasks(sock) {
    const saved = loadScheduledTasks();
    for (const task of saved) {
        if (task.fireAt <= Date.now()) continue;
        if (task.id >= nextTaskId) nextTaskId = task.id + 1;
        scheduleTask(sock, { ...task });
    }
    if (saved.length) {
        console.log(`[scheduler] restored ${activeTasks.size} scheduled task(s)`);
    }
}

function parseDelayToken(token) {
    const raw = String(token || "").trim().toLowerCase();
    if (!raw) return null;

    const match = raw.match(/^(\d+)([smhd])?$/i);
    if (!match) return null;

    const amount = Number(match[1]);
    if (!Number.isFinite(amount) || amount <= 0) return null;

    const unit = String(match[2] || "m").toLowerCase();
    const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
    return amount * multipliers[unit];
}

module.exports = {
    name: "schedule",
    react: "⏰",
    category: "main",
    description: "Schedule a message or reminder after a delay",
    usage: ",schedule <10m|1h|1d> <message> | ,schedule list | ,schedule cancel <id>",
    aliases: ["remind"],

    onInit(sock) {
        restoreScheduledTasks(sock);
    },

    execute: async (sock, m) => {
        const command = String(m.command || "").toLowerCase();
        const botName = process.env.BOT_NAME || "MANTRA";
        const arg0 = String(m.args?.[0] || "").trim().toLowerCase();

        if (arg0 === "list" || arg0 === "ls") {
            if (!activeTasks.size) {
                await m.reply("No scheduled tasks.");
                return;
            }

            const lines = [`╭─ ⏰ *Scheduled Tasks* ─`, `│`];
            for (const [id, task] of activeTasks) {
                const remaining = Math.max(0, task.fireAt - Date.now());
                lines.push(`│  #${id} — in *${runtime(remaining / 1000)}*`);
                lines.push(`│  _${task.text.slice(0, 60)}${task.text.length > 60 ? "..." : ""}_`);
                lines.push(`│`);
            }
            lines.push(`╰──────────────`);
            lines.push(``);
            lines.push(`> *${botName}*`);
            await m.reply(lines.join("\n"));
            return;
        }

        if (arg0 === "cancel" || arg0 === "rm") {
            const taskId = parseInt(m.args?.[1], 10);
            if (!taskId || !activeTasks.has(taskId)) {
                await m.reply("Task not found. Use: " + m.prefix + "schedule list");
                return;
            }
            const task = activeTasks.get(taskId);
            if (task.timer) clearTimeout(task.timer);
            activeTasks.delete(taskId);
            saveScheduledTasks();
            await m.reply(`Cancelled scheduled task #${taskId}.`);
            return;
        }

        const delayToken = String(m.args?.[0] || "").trim();
        const delayMs = parseDelayToken(delayToken);
        const text = String(m.args?.slice(1).join(" ") || "").trim();

        if (!delayMs || !text) {
            await m.reply(
                `╭─ ⏰ *Schedule* ─\n` +
                `│\n` +
                `│  Usage:\n` +
                `│  ${m.prefix}schedule <delay> <message>\n` +
                `│  ${m.prefix}remind <delay> <message>\n` +
                `│  ${m.prefix}schedule list\n` +
                `│  ${m.prefix}schedule cancel <id>\n` +
                `│\n` +
                `│  Delay: 10s, 5m, 2h, 1d\n` +
                `│  Max: 7 days\n` +
                `│\n` +
                `╰──────────────\n\n` +
                `> *${botName}*`
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
        const task = {
            id: taskId,
            destination,
            text,
            fireAt: Date.now() + delayMs,
            command,
            sender: m.sender
        };

        scheduleTask(sock, task);
        saveScheduledTasks();

        await m.reply(
            `╭─ ⏰ *Task Scheduled* ─\n` +
            `│\n` +
            `│  ID: #${taskId}\n` +
            `│  Fires in: *${runtime(delayMs / 1000)}*\n` +
            `│  Message: _${text.slice(0, 80)}${text.length > 80 ? "..." : ""}_\n` +
            `│\n` +
            `│  Survives restarts.\n` +
            `│\n` +
            `╰──────────────\n\n` +
            `> *${botName}*`
        );
    }
};
