const DEFAULT_EMOJI = "❤️";

function normalizeStatusReact(value) {
    const source = value && typeof value === "object" ? value : {};
    const hasEnabled = Object.prototype.hasOwnProperty.call(source, "enabled");
    return {
        enabled: hasEnabled ? Boolean(source.enabled) : false,
        emoji: String(source.emoji || "").trim() || DEFAULT_EMOJI,
        random: Boolean(source.random)
    };
}

module.exports = {
    name: "autostatusreact",
    react: "💫",
    category: "owner",
    description: "Toggle auto-reaction on WhatsApp statuses (fixed emoji or random)",
    usage: ",autostatusreact on|off|random [emoji]",
    aliases: ["statusreact", "statusreaction"],

    execute: async (_sock, m, mantra) => {
        if (!m.isOwner) {
            await m.reply("Owner only command.");
            return;
        }

        const state = String(m.args?.[0] || "").trim().toLowerCase();
        const current = normalizeStatusReact(mantra.settings.autostatusreact);

        if (!state) {
            await m.reply(
                `💫 *Auto Status React*\n\n` +
                `• Status: ${current.enabled ? "✅ ON" : "❌ OFF"}\n` +
                `• Mode: ${current.random ? "🎲 Random" : "🎯 Fixed"}\n` +
                `• Emoji: ${current.emoji}\n\n` +
                `Usage:\n` +
                `• ${m.prefix}autostatusreact on|off [emoji]\n` +
                `• ${m.prefix}autostatusreact random — use random emojis`
            );
            return;
        }

        if (state === "random") {
            mantra.settings.autostatusreact = {
                enabled: true,
                emoji: current.emoji,
                random: true
            };
            mantra.saveSettings();
            await m.reply(
                `💫 Auto Status React is now ✅ ON with 🎲 *Random* emojis\n` +
                `(❤️ 🔥 😍 👏 💯 🙌 ✨ 💫 🎉 😮 💖 ⚡ 🤩 💪 🌟)`
            );
            return;
        }

        if (!["on", "off"].includes(state)) {
            await m.reply(`Usage: ${m.prefix}autostatusreact on|off|random [emoji]`);
            return;
        }

        const emojiCandidate = String(m.args?.[1] || "").trim();
        mantra.settings.autostatusreact = {
            enabled: state === "on",
            emoji: emojiCandidate || current.emoji || DEFAULT_EMOJI,
            random: false
        };
        mantra.saveSettings();

        await m.reply(
            `💫 Auto Status React is now ${mantra.settings.autostatusreact.enabled ? "✅ ON" : "❌ OFF"} ` +
            `(${mantra.settings.autostatusreact.emoji})`
        );
    }
};
