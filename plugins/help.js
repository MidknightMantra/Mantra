const { getPlatform } = require("../lib/helper");

const TZ = "Africa/Nairobi";

function clockString(ms) {
    const h = Number.isFinite(ms) ? Math.floor(ms / 3600000) : 0;
    const m = Number.isFinite(ms) ? Math.floor(ms / 60000) % 60 : 0;
    const s = Number.isFinite(ms) ? Math.floor(ms / 1000) % 60 : 0;
    return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

function greeting() {
    const hour = Number(
        new Intl.DateTimeFormat("en-US", {
            hour: "2-digit",
            hour12: false,
            timeZone: TZ
        }).format(new Date())
    );

    if (hour >= 0 && hour < 4) return "Good Night 🌌";
    if (hour >= 4 && hour < 12) return "Good Morning 🌤️";
    if (hour >= 12 && hour < 16) return "Good Afternoon 🌞";
    if (hour >= 16 && hour < 19) return "Good Evening 🌆";
    return "Good Night 🌙";
}

function getDateTime() {
    const now = new Date();
    const date = new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: TZ
    }).format(now);

    const time = new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
        timeZone: TZ
    }).format(now);

    return { date, time };
}

function normalizeCategory(value) {
    const clean = String(value || "").trim().toLowerCase();
    if (!clean) return "Utility";
    return clean
        .split(/[\s_-]+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}

function inferCategory(name, plugin) {
    const normalizedName = String(name || "").toLowerCase();
    const description = String(plugin?.description || "").toLowerCase();

    if (normalizedName.startsWith("anti") || plugin?.onMessageUpdate || plugin?.onMessage) {
        return "Security";
    }

    if (
        normalizedName.includes("view") ||
        normalizedName === "vv" ||
        description.includes("media")
    ) {
        return "Media";
    }

    if (["help", "menu", "ping", "uptime"].includes(normalizedName)) {
        return "General";
    }

    return "Utility";
}

function getLoadedPlugins() {
    const loaded = new Map();

    for (const mod of Object.values(require.cache)) {
        if (!mod || !mod.filename || !mod.exports) continue;
        if (!/[\\/]plugins[\\/]/.test(mod.filename)) continue;

        const plugin = mod.exports;
        if (!plugin || typeof plugin !== "object" || !plugin.name) continue;

        const name = String(plugin.name).toLowerCase();
        loaded.set(name, {
            name,
            label: plugin.name,
            description: plugin.description || "No description",
            aliases: Array.isArray(plugin.aliases) ? plugin.aliases.map((a) => String(a).toLowerCase()) : [],
            category: normalizeCategory(plugin.category || inferCategory(name, plugin))
        });
    }

    return Array.from(loaded.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function formatCommandRows(plugins, prefix) {
    const grouped = new Map();

    for (const plugin of plugins) {
        const category = plugin.category || "Utility";
        if (!grouped.has(category)) {
            grouped.set(category, []);
        }
        grouped.get(category).push(plugin);
    }

    const lines = [];
    const sortedCategories = Array.from(grouped.keys()).sort((a, b) => a.localeCompare(b));

    for (const category of sortedCategories) {
        const categoryPlugins = grouped.get(category).sort((a, b) => a.name.localeCompare(b.name));
        lines.push(`┃ 🧩 *${category}*`);
        for (const plugin of categoryPlugins) {
            lines.push(`┃ • *${prefix}${plugin.name}*`);
        }
        lines.push("┃");
    }

    if (lines[lines.length - 1] === "┃") {
        lines.pop();
    }

    return lines;
}

const quotes = [
    "Life is short, smile while you still have teeth.",
    "If you cannot convince them, confuse them.",
    "The road to success is always under construction.",
    "Sometimes the best answer is to keep moving.",
    "My bed is a magical place where ideas appear at 2AM.",
    "I'm not lazy, I'm on energy-saving mode.",
    "If life gives you lemons, find someone with soda.",
    "Build what matters. Delete what doesn't."
];

module.exports = {
    name: "help",
    category: "general",
    description: "Display dynamic bot menu and command list",
    usage: ",menu",
    aliases: ["menu", "help", "h", "list", "commands"],

    execute: async (sock, m, mantra) => {
        try {
            const usedPrefix = m.prefix || ",";
            const plugins = getLoadedPlugins();
            const { date, time } = getDateTime();
            const uptime = clockString(process.uptime() * 1000);
            const taguser = `@${m.sender.split("@")[0]}`;
            const resolvedName = await Promise.resolve(
                typeof sock.getName === "function" ? sock.getName(m.sender) : ""
            );
            const displayName = String(resolvedName || "").trim() || taguser;
            const quote = quotes[Math.floor(Math.random() * quotes.length)];
            const more = String.fromCharCode(8206);
            const readMore = more.repeat(850);

            const trackedUsers = new Set(
                Array.from(mantra?.messageStore?.values() || [])
                    .map((item) => item?.sender)
                    .filter(Boolean)
            );
            const totaluser = trackedUsers.size;
            const rtotalreg = trackedUsers.size;

            const botName = process.env.BOT_NAME || "MANTRA";
            const ownerName = process.env.BOT_OWNER || "Mantra Owner";
            const platform = getPlatform();
            const commandRows = formatCommandRows(plugins, usedPrefix).join("\n");

            const str = `
╭━━━⊰ *${botName}* ⊱━━━╮
┃
┃ 🫡 Hello, ${displayName}!
┃ ${greeting()}
┃
┃ 🧩 *${quote}*
┃
╰━━━━━━━━━━━━━━━╯

╭━━━⊰ *TODAY* ⊱━━━╮
┃ 📆 *Date:* ${date}
┃ 🕰️ *Time:* ${time}
╰━━━━━━━━━━━━━━━╯

╭━━━⊰ *BOT INFO* ⊱━━━╮
┃ 🛸 *Bot Name:* ${botName}
┃ 🧠 *Owner:* ${ownerName}
┃ 🧭 *Platform:* ${platform}
┃ 🧷 *Prefix:* ${usedPrefix}
┃ ⌛ *Uptime:* ${uptime}
┃ 🧮 *Commands:* ${plugins.length}
┃ 👥 *Users:* ${totaluser}
┃ 🗂️ *Registered:* ${rtotalreg}
╰━━━━━━━━━━━━━━━╯
${readMore}
╭━━━⊰ *COMMANDS* ⊱━━━╮
${commandRows}
╰━━━━━━━━━━━━━━━╯
`;

            await m.reply(str.trim());
        } catch (e) {
            console.error("menu error:", e);
            await m.reply(
                "*MENU*\n\nUse:\n" +
                "• ,help - Show menu\n" +
                "• ,ping - Check response time\n" +
                "• ,uptime - Bot uptime"
            );
        }
    }
};
