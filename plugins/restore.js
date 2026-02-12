const fs = require("fs");
const path = require("path");

const GROUP_SETTINGS_PATH = path.resolve("./group-settings.json");

function isValidTimeZone(value) {
    const timezone = String(value || "").trim();
    if (!timezone) return false;

    try {
        new Intl.DateTimeFormat("en-GB", { timeZone: timezone }).format(new Date());
        return true;
    } catch {
        return false;
    }
}

function normalizeAutoReact(value) {
    const raw = value && typeof value === "object" ? value : {};
    return {
        enabled: Boolean(raw.enabled),
        emoji: String(raw.emoji || "").trim() || "✅"
    };
}

module.exports = {
    name: "restore",
    react: "♻️",
    category: "owner",
    description: "Restore bot settings from backup JSON",
    usage: ",restore (reply to backup JSON file)",
    aliases: ["importbackup"],

    execute: async (_sock, m, mantra) => {
        if (!m.isOwner) {
            await m.reply("Owner only command.");
            return;
        }

        let rawText = "";
        try {
            if (m.quoted?.documentMessage) {
                const buffer = await m.downloadQuoted();
                rawText = Buffer.from(buffer).toString("utf8");
            } else {
                rawText = String(m.args?.join(" ") || "").trim();
            }
        } catch (err) {
            await m.reply(`Failed to read restore payload: ${err?.message || err}`);
            return;
        }

        if (!rawText) {
            await m.reply("Reply to a backup JSON document or provide JSON text.");
            return;
        }

        let parsed;
        try {
            parsed = JSON.parse(rawText);
        } catch (err) {
            await m.reply(`Invalid JSON payload: ${err?.message || err}`);
            return;
        }

        if (parsed?.settings && typeof parsed.settings === "object") {
            const settings = parsed.settings;
            if (typeof settings.antidelete !== "undefined") mantra.settings.antidelete = Boolean(settings.antidelete);
            if (typeof settings.antigcmention !== "undefined") mantra.settings.antigcmention = Boolean(settings.antigcmention);
            if (typeof settings.autostatusview !== "undefined") mantra.settings.autostatusview = Boolean(settings.autostatusview);
            if (typeof settings.autobio !== "undefined") mantra.settings.autobio = Boolean(settings.autobio);
            if (typeof settings.prefix === "string" && /^[^\w\s]$/u.test(settings.prefix.trim())) {
                mantra.settings.prefix = settings.prefix.trim();
                mantra.prefix = settings.prefix.trim();
            }
            if (isValidTimeZone(settings.timezone)) {
                mantra.settings.timezone = String(settings.timezone).trim();
            }
            mantra.settings.autoreact = normalizeAutoReact(settings.autoreact);
            mantra.saveSettings();
        }

        if (parsed?.groupSettings && typeof parsed.groupSettings === "object") {
            const nextGroupSettings = {
                settings:
                    parsed.groupSettings.settings && typeof parsed.groupSettings.settings === "object"
                        ? parsed.groupSettings.settings
                        : {},
                counters:
                    parsed.groupSettings.counters && typeof parsed.groupSettings.counters === "object"
                        ? parsed.groupSettings.counters
                        : {}
            };
            fs.writeFileSync(GROUP_SETTINGS_PATH, JSON.stringify(nextGroupSettings, null, 2));
        }

        if (typeof mantra.refreshAutoBio === "function" && mantra.settings.autobio) {
            await mantra.refreshAutoBio();
        }

        await m.reply("Backup restored successfully.");
    }
};
