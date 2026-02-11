const { getPlatform } = require("../lib/helper");

const MENU_KEYS = ["main", "download", "group", "owner", "convert", "search", "fun", "other"];

function runtime(seconds) {
    const total = Math.max(0, Math.floor(Number(seconds) || 0));
    const d = Math.floor(total / 86400);
    const h = Math.floor((total % 86400) / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return `${d}d ${h}h ${m}m ${s}s`;
}

function normalizeCategory(value) {
    const raw = String(value || "").trim().toLowerCase();
    if (!raw) return "other";
    if (MENU_KEYS.includes(raw)) return raw;

    if (["general", "core", "utility"].includes(raw)) return "main";
    if (["media", "tools"].includes(raw)) return "convert";
    if (["security"].includes(raw)) return "other";
    return "other";
}

function inferCategory(plugin) {
    const name = String(plugin?.name || "").toLowerCase();
    const desc = String(plugin?.description || "").toLowerCase();

    if (["help", "menu", "ping", "uptime"].includes(name)) return "main";
    if (name.startsWith("anti")) return "other";
    if (name.includes("search")) return "search";
    if (name.includes("group")) return "group";
    if (name.includes("fun")) return "fun";
    if (name === "vv" || desc.includes("media")) return "convert";
    return "other";
}

function getLoadedPlugins(prefix) {
    const loaded = new Map();

    for (const mod of Object.values(require.cache)) {
        if (!mod || !mod.filename || !mod.exports) continue;
        if (!/[\\/]plugins[\\/]/.test(mod.filename)) continue;

        const plugin = mod.exports;
        if (!plugin || typeof plugin !== "object" || !plugin.name) continue;
        if (plugin.dontAddCommandList) continue;

        const name = String(plugin.name).toLowerCase();
        loaded.set(name, {
            name,
            command: `${prefix}${name}`,
            category: normalizeCategory(plugin.category || inferCategory(plugin))
        });
    }

    return Array.from(loaded.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function makeSection(title, icon, content) {
    return `\n────────────────────\n${icon} *${title}:*\n\n${content || "_No commands yet_"}\n`;
}

module.exports = {
    name: "help",
    react: "🧭",
    category: "main",
    description: "Display dynamic bot menu and command list",
    usage: ",menu",
    aliases: ["menu", "help", "h", "list", "commands"],

    execute: async (sock, m) => {
        try {
            const usedPrefix = m.prefix || ",";
            const displayNameRaw =
                typeof sock.getName === "function"
                    ? await Promise.resolve(sock.getName(m.sender))
                    : "";
            const pushname = String(displayNameRaw || "").trim() || `@${m.sender.split("@")[0]}`;

            const botName = process.env.BOT_NAME || "MANTRA";
            const ownerName = process.env.BOT_OWNER || "MidknightMantra";
            const ownerNumber = process.env.BOT_OWNER_NUMBER || process.env.OWNER_NUMBER || "254710407153";
            const platform = getPlatform();

            const menu = {
                main: "",
                download: "",
                group: "",
                owner: "",
                convert: "",
                search: "",
                fun: "",
                other: ""
            };

            for (const plugin of getLoadedPlugins(usedPrefix)) {
                menu[plugin.category] += `${plugin.command}\n`;
            }

            const madeMenu = `
🛸👑 ${botName} 👑🛸

      🙌 HELLO, ${pushname}!

✨ Welcome to ${botName}! ✨

📡 *Bot Information:*
────────────────────
⏱️ *Runtime:* ${runtime(process.uptime())}
🧑‍💼 *Owner Name:* ${ownerName}
📲 *Owner Number:* ${ownerNumber}
🖥️ *Platform:* ${platform}
🧩 *Prefix:* ${usedPrefix}
────────────────────${makeSection("Download Menu", "📦", menu.download.trim())}${makeSection("Main Menu", "🧭", menu.main.trim())}${makeSection("Fun Menu", "🎲", menu.fun.trim())}${makeSection("Group Menu", "🫂", menu.group.trim())}${makeSection("Owner Menu", "🛡️", menu.owner.trim())}${makeSection("Convert Menu", "🧪", menu.convert.trim())}${makeSection("Search Menu", "🔎", menu.search.trim())}${makeSection("Other Menu", "🛠️", menu.other.trim())}
────────────────────
*© ${botName}*
`;

            await m.reply(madeMenu.trim());
        } catch (e) {
            console.error("menu error:", e);
            await m.reply("Menu failed to load.");
        }
    }
};
