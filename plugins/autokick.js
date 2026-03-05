const { getGroupAdminState, mentionTag } = require("../lib/groupTools");
const { getSettings, setSettings } = require("../lib/groupSettings");

// Schema: { "autokick": { "enabled": true, "bannedPrefixes": ["+212", "+92", "+380"] } }

module.exports = {
    name: "autokick",
    react: "🚷",
    category: "admin",
    description: "Manage Auto-kick settings for foreign numbers",
    usage: ",autokick <on|off|status|add|remove>",
    aliases: ["ak"],

    execute: async (sock, m) => {
        const state = await getGroupAdminState(sock, m);
        if (!state.ok) return m.reply(state.error);

        const adminAllowed = state.senderIsAdmin || m.isOwner;
        if (!adminAllowed) {
            return m.reply("Admin/owner only command.");
        }

        const settings = getSettings(m.from);
        if (!settings.autokick) {
            settings.autokick = { enabled: false, bannedPrefixes: [] };
        }

        const sub = (m.args?.[0] || "").toLowerCase();
        const val = m.args?.[1];

        if (sub === "on") {
            settings.autokick.enabled = true;
            setSettings(m.from, settings);
            return m.reply("✅ Auto-kick enabled for this group.");
        }

        if (sub === "off") {
            settings.autokick.enabled = false;
            setSettings(m.from, settings);
            return m.reply("❌ Auto-kick disabled for this group.");
        }

        if (sub === "add") {
            if (!val || !val.startsWith('+')) return m.reply(`Specify a country code starting with '+'\nExample: ${m.prefix}autokick add +212`);
            if (!settings.autokick.bannedPrefixes.includes(val)) {
                settings.autokick.bannedPrefixes.push(val);
                setSettings(m.from, settings);
            }
            return m.reply(`✅ Added ${val} to banned prefixes.`);
        }

        if (sub === "remove") {
            if (!val || !val.startsWith('+')) return m.reply(`Specify a country code starting with '+'\nExample: ${m.prefix}autokick remove +212`);
            settings.autokick.bannedPrefixes = settings.autokick.bannedPrefixes.filter(p => p !== val);
            setSettings(m.from, settings);
            return m.reply(`❌ Removed ${val} from banned prefixes.`);
        }

        // Status or empty
        const statusStr = settings.autokick.enabled ? "✅ Enabled" : "❌ Disabled";
        const prefixesStr = settings.autokick.bannedPrefixes.length > 0
            ? settings.autokick.bannedPrefixes.join(", ")
            : "None";

        const text = `🚷 *Auto-Kick Settings*\n\n` +
            `Status: ${statusStr}\n` +
            `Banned Prefixes: ${prefixesStr}\n\n` +
            `Usage:\n` +
            `${m.prefix}autokick on/off\n` +
            `${m.prefix}autokick add +code\n` +
            `${m.prefix}autokick remove +code`;

        return m.reply(text);
    }
};
