const DEFAULT_EMOJI = "❤️";

function normalizeStatusReact(value) {
    const source = value && typeof value === "object" ? value : {};
    const hasEnabled = Object.prototype.hasOwnProperty.call(source, "enabled");
    return {
        enabled: hasEnabled ? Boolean(source.enabled) : true,
        emoji: String(source.emoji || "").trim() || DEFAULT_EMOJI
    };
}

module.exports = {
    name: "autostatusreact",
    react: "💫",
    category: "owner",
    description: "Toggle auto-reaction on WhatsApp statuses",
    usage: ",autostatusreact on|off [emoji]",
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
                `Auto Status React is ${current.enabled ? "ON" : "OFF"}\n` +
                `Emoji: ${current.emoji}\n` +
                `Usage: ${m.prefix}autostatusreact on|off [emoji]`
            );
            return;
        }

        if (!["on", "off"].includes(state)) {
            await m.reply(`Usage: ${m.prefix}autostatusreact on|off [emoji]`);
            return;
        }

        const emojiCandidate = String(m.args?.[1] || "").trim();
        mantra.settings.autostatusreact = {
            enabled: state === "on",
            emoji: emojiCandidate || current.emoji || DEFAULT_EMOJI
        };
        mantra.saveSettings();

        await m.reply(
            `Auto Status React is now ${mantra.settings.autostatusreact.enabled ? "ON" : "OFF"} ` +
            `(${mantra.settings.autostatusreact.emoji})`
        );
    }
};
