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

module.exports = {
    name: "settimezone",
    react: "🌍",
    category: "owner",
    description: "Set timezone used by bot time-based features",
    usage: ",settimezone <Region/City>",
    aliases: ["timezone", "tz"],

    execute: async (_sock, m, mantra) => {
        if (!m.isOwner) {
            await m.reply("Owner only command.");
            return;
        }

        const input = String(m.args?.join(" ") || "").trim();
        const current = String(mantra?.settings?.timezone || "UTC");

        if (!input) {
            await m.reply(
                `Current timezone: *${current}*\n` +
                `Usage: ${m.prefix}settimezone <Region/City>\n` +
                `Example: ${m.prefix}settimezone Africa/Nairobi`
            );
            return;
        }

        if (!isValidTimeZone(input)) {
            await m.reply(
                `Invalid timezone: *${input}*\n` +
                `Use IANA format, for example: Africa/Nairobi, UTC, Europe/London, America/New_York`
            );
            return;
        }

        mantra.settings.timezone = input;
        mantra.saveSettings();
        if (typeof mantra.refreshAutoBio === "function") {
            await mantra.refreshAutoBio();
        }

        await m.reply(`Timezone updated to *${input}*`);
    }
};
