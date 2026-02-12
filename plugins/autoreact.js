const DEFAULT_EMOJI = "✅";

function getSettings(mantra) {
    const source = mantra?.settings?.autoreact;
    const normalized = source && typeof source === "object" ? source : {};
    return {
        enabled: Boolean(normalized.enabled),
        emoji: String(normalized.emoji || "").trim() || DEFAULT_EMOJI
    };
}

module.exports = {
    name: "autoreact",
    react: "⚡",
    category: "owner",
    description: "Auto react to incoming messages",
    usage: ",autoreact on|off [emoji]",
    aliases: ["reactauto", "autoseenreact"],

    execute: async (_sock, m, mantra) => {
        if (!m.isOwner) {
            await m.reply("Owner only command.");
            return;
        }

        const arg = String(m.args?.[0] || "").trim().toLowerCase();
        const current = getSettings(mantra);

        if (!arg) {
            await m.reply(
                `AutoReact is ${current.enabled ? "ON" : "OFF"}\n` +
                `Emoji: ${current.emoji}\n` +
                `Usage: ${m.prefix}autoreact on|off [emoji]`
            );
            return;
        }

        if (!["on", "off"].includes(arg)) {
            await m.reply(`Usage: ${m.prefix}autoreact on|off [emoji]`);
            return;
        }

        const next = {
            enabled: arg === "on",
            emoji: String(m.args?.[1] || current.emoji || DEFAULT_EMOJI).trim() || DEFAULT_EMOJI
        };

        mantra.settings.autoreact = next;
        mantra.saveSettings();
        await m.reply(`AutoReact is now ${next.enabled ? "ON" : "OFF"} (${next.emoji})`);
    },

    onMessage: async (sock, m, mantra) => {
        const settings = getSettings(mantra);
        if (!settings.enabled) return;
        if (m.key?.fromMe) return;
        if (m.from === "status@broadcast") return;
        if (m.message?.reactionMessage) return;

        try {
            await sock.sendMessage(m.from, {
                react: { text: settings.emoji, key: m.key }
            });
        } catch {}
    }
};
