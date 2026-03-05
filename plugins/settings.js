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
        const autostatusreact = s.autostatusreact || { enabled: false, emoji: "❤️", random: false };
        const autostatusreply = s.autostatusreply || { enabled: false, text: "" };
        const autojoin = s.autojoin || { enabled: false, groups: [] };
        const autofollow = s.autofollow || { enabled: false, channels: [] };
        const anticall = s.anticall || { enabled: false, block: false };
        const antibadword = s.antibadword || { enabled: false, words: [], action: "warn" };
        const presence = s.presence || { mode: "online", auto: false };

        const chatbot = s.chatbot || { enabled: false, mode: "dm" };

        const on = (v) => v ? "✅ ON" : "❌ OFF";

        const text = [
            `╭─ ⚙️ *${botName} Settings* ─`,
            `│`,
            `├── 🔧 *General*`,
            `│  Prefix: *${s.prefix || ","}*`,
            `│  Timezone: ${s.timezone || "UTC"}`,
            `│`,
            `├── 🤖 *Auto Features*`,
            `│  Auto Bio: ${on(s.autobio)}`,
            `│  Auto React: ${on(autoreact.enabled)}${autoreact.enabled ? ` (${autoreact.emoji})` : ""}`,
            `│  Presence: ${presence.mode}${presence.auto ? " (auto)" : ""}`,
            `│  Chatbot: ${on(chatbot.enabled)}${chatbot.enabled ? ` (${chatbot.mode})` : ""}`,
            `│`,
            `├── 👁️ *Status*`,
            `│  Status View: ${on(s.autostatusview !== false)}  [${mantra.statusViewCount || 0} viewed]`,
            `│  Status React: ${on(autostatusreact.enabled)}${autostatusreact.enabled ? ` (${autostatusreact.random ? "random" : autostatusreact.emoji})` : ""}`,
            `│  Status Reply: ${on(autostatusreply.enabled)}${autostatusreply.enabled && autostatusreply.text ? ` "${autostatusreply.text.slice(0, 30)}"` : ""}`,
            `│`,
            `├── 🔗 *Auto Join/Follow*`,
            `│  Auto Join: ${on(autojoin.enabled)} _(${autojoin.groups?.length || 0} groups)_`,
            `│  Auto Follow: ${on(autofollow.enabled)} _(${autofollow.channels?.length || 0} channels)_`,
            `│`,
            `├── 🛡️ *Protection*`,
            `│  Anti Delete: ${on(s.antidelete !== false)}`,
            `│  Anti View Once: ${on(s.antiviewonce)}`,
            `│  Anti GC Mention: ${on(s.antigcmention)}`,
            `│  Anti Call: ${on(anticall.enabled)}${anticall.enabled ? ` (${anticall.block ? "block" : "reject"})` : ""}`,
            `│  Anti Badword: ${on(antibadword.enabled)}${antibadword.enabled ? ` [${(antibadword.words || []).length} words, ${antibadword.action}]` : ""}`,
            `│`,
            `╰──────────────`,
            ``,
            `> *${botName}*`
        ].join("\n");

        await m.reply(text);
    }
};
