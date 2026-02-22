module.exports = {
    name: "settings",
    react: "⚙️",
    category: "owner",
    description: "View all current bot settings in one place",
    usage: ",settings",
    aliases: ["config", "botsettings"],

    execute: async (_sock, m, mantra) => {
        if (!m.isOwner) {
            await m.reply("Owner only command.");
            return;
        }

        const s = mantra?.settings || {};
        const botName = process.env.BOT_NAME || "MANTRA";

        const autoreact = s.autoreact || { enabled: false, emoji: "✅" };
        const autostatusreact = s.autostatusreact || { enabled: false, emoji: "❤️" };
        const autojoin = s.autojoin || { enabled: false, groups: [] };
        const autofollow = s.autofollow || { enabled: false, channels: [] };

        const onOff = (val) => val ? "ON" : "OFF";

        const text = [
            `╭─ ⚙️ *Bot Settings* ─`,
            `│`,
            `├── *General*`,
            `│  Prefix: *${s.prefix || ","}*`,
            `│  Timezone: ${s.timezone || "UTC"}`,
            `│`,
            `├── *Auto Features*`,
            `│  Auto Bio: ${onOff(s.autobio)}`,
            `│  Auto React: ${onOff(autoreact.enabled)}${autoreact.enabled ? ` (${autoreact.emoji})` : ""}`,
            `│  Status View: ${onOff(s.autostatusview !== false)}`,
            `│  Status React: ${onOff(autostatusreact.enabled)}${autostatusreact.enabled ? ` (${autostatusreact.emoji})` : ""}`,
            `│`,
            `├── *Auto Join/Follow*`,
            `│  Auto Join: ${onOff(autojoin.enabled)} _(${autojoin.groups?.length || 0} groups)_`,
            `│  Auto Follow: ${onOff(autofollow.enabled)} _(${autofollow.channels?.length || 0} channels)_`,
            `│`,
            `├── *Protection*`,
            `│  Anti Delete: ${onOff(s.antidelete !== false)}`,
            `│  Anti View Once: ${onOff(s.antiviewonce)}`,
            `│`,
            `╰──────────────`,
            ``,
            `> *${botName}*`
        ].join("\n");

        await m.reply(text);
    }
};
