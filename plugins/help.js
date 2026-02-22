const { getPlatform } = require("../lib/helper");

const CATEGORIES = {
    main: { icon: "🧭", label: "Main" },
    download: { icon: "📥", label: "Download" },
    group: { icon: "👥", label: "Group" },
    owner: { icon: "👑", label: "Owner" },
    convert: { icon: "🔄", label: "Convert" },
    search: { icon: "🔍", label: "Search" },
    fun: { icon: "🎮", label: "Fun" },
    other: { icon: "⚙️", label: "Other" }
};

const CATEGORY_KEYS = Object.keys(CATEGORIES);

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

function normalizeCategory(value) {
    const raw = String(value || "").trim().toLowerCase();
    if (!raw) return "other";
    if (CATEGORY_KEYS.includes(raw)) return raw;
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
            description: String(plugin.description || "").trim(),
            category: normalizeCategory(plugin.category || inferCategory(plugin))
        });
    }

    return Array.from(loaded.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function buildMainMenu(plugins, prefix, pushname, botName, ownerName, platform) {
    const grouped = {};
    for (const key of CATEGORY_KEYS) grouped[key] = [];
    for (const p of plugins) grouped[p.category].push(p);

    const totalCommands = plugins.length;
    const uptime = runtime(process.uptime());

    const lines = [];
    lines.push(`╭─── *${botName}* ───`);
    lines.push(`│`);
    lines.push(`│  Hey, *${pushname}*`);
    lines.push(`│`);
    lines.push(`│  ⏱ ${uptime}  ·  ${totalCommands} commands`);
    lines.push(`│  👤 ${ownerName}  ·  🖥 ${platform}`);
    lines.push(`│  🔑 Prefix: *${prefix}*`);
    lines.push(`│`);
    lines.push(`╰──────────────`);
    lines.push(``);

    for (const key of CATEGORY_KEYS) {
        const cat = CATEGORIES[key];
        const items = grouped[key];
        if (!items.length) continue;

        lines.push(`${cat.icon} *${cat.label}* _(${items.length})_`);
        const cmds = items.map(p => `\`${p.command}\``).join("  ");
        lines.push(cmds);
        lines.push(``);
    }

    lines.push(`> Type *${prefix}menu <category>* for details`);
    lines.push(`> _Example: ${prefix}menu group_`);
    lines.push(``);
    lines.push(`> *${botName}*`);

    return lines.join("\n");
}

function buildCategoryMenu(categoryKey, plugins, prefix, botName) {
    const cat = CATEGORIES[categoryKey];
    const items = plugins.filter(p => p.category === categoryKey);

    if (!items.length) {
        return `${cat.icon} *${cat.label}* — No commands in this category.`;
    }

    const lines = [];
    lines.push(`╭─ ${cat.icon} *${cat.label} Commands* ─`);
    lines.push(`│`);

    for (const p of items) {
        const desc = p.description || "No description";
        lines.push(`│  \`${p.command}\``);
        lines.push(`│  _${desc}_`);
        lines.push(`│`);
    }

    lines.push(`╰── _${items.length} command(s)_ ──`);
    lines.push(``);
    lines.push(`> *${botName}*`);

    return lines.join("\n");
}

module.exports = {
    name: "help",
    react: "🧭",
    category: "main",
    description: "Display bot menu and command list",
    usage: ",menu [category]",
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
            const platform = getPlatform();
            const plugins = getLoadedPlugins(usedPrefix);

            const arg = String(m.args?.[0] || "").trim().toLowerCase();

            if (arg) {
                const matchedKey = CATEGORY_KEYS.find(k =>
                    k === arg || CATEGORIES[k].label.toLowerCase() === arg
                );

                if (matchedKey) {
                    await m.reply(buildCategoryMenu(matchedKey, plugins, usedPrefix, botName));
                    return;
                }

                const matchedPlugin = plugins.find(p => p.name === arg);
                if (matchedPlugin) {
                    await m.reply(
                        `*${matchedPlugin.command}*\n` +
                        `_${matchedPlugin.description || "No description"}_\n` +
                        `Category: ${CATEGORIES[matchedPlugin.category]?.label || matchedPlugin.category}`
                    );
                    return;
                }

                await m.reply(`Category or command "${arg}" not found.\nAvailable: ${CATEGORY_KEYS.join(", ")}`);
                return;
            }

            await m.reply(buildMainMenu(plugins, usedPrefix, pushname, botName, ownerName, platform));
        } catch (e) {
            console.error("menu error:", e);
            await m.reply("Menu failed to load.");
        }
    }
};
