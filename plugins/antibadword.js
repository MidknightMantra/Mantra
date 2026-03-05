const DEFAULT_WARN_MSG = "⚠️ Please do not use bad words here.";
const DEFAULT_ACTION = "warn"; // warn | delete | kick

function getBadwords(mantra) {
    const raw = mantra.settings?.antibadword?.words;
    return Array.isArray(raw) ? raw.map((w) => String(w).toLowerCase().trim()).filter(Boolean) : [];
}

function containsBadword(text, badwords) {
    const lower = String(text || "").toLowerCase();
    return badwords.some((w) => lower.includes(w));
}

module.exports = {
    name: "antibadword",
    react: "🚫",
    category: "owner",
    description: "Block bad words in groups (warn, delete, or kick)",
    usage: ",antibadword on|off|add <word>|remove <word>|list|action <warn|delete|kick>",
    aliases: ["badword", "antiswear", "wordfilter"],

    onMessage: async (sock, m, mantra) => {
        if (!m.isGroup) return;
        const config = mantra.settings?.antibadword || {};
        if (!config.enabled) return;
        if (m.isOwner) return;

        const badwords = getBadwords(mantra);
        if (!badwords.length) return;
        if (!containsBadword(m.body, badwords)) return;

        const action = String(config.action || DEFAULT_ACTION).toLowerCase();

        try {
            // Always delete the message
            await sock.sendMessage(m.from, {
                delete: m.key
            });
        } catch { }

        if (action === "kick") {
            try {
                await sock.groupParticipantsUpdate(m.from, [m.sender], "remove");
                await sock.sendMessage(m.from, {
                    text: `🚫 @${m.sender.split("@")[0]} was removed for using bad language.`,
                    mentions: [m.sender]
                });
            } catch (e) {
                console.error("[antibadword] kick failed:", e?.message || e);
            }
        } else if (action === "warn") {
            try {
                const warnMsg = String(config.warnMessage || DEFAULT_WARN_MSG);
                await sock.sendMessage(m.from, {
                    text: `${warnMsg}\n@${m.sender.split("@")[0]}`,
                    mentions: [m.sender]
                });
            } catch { }
        }
    },

    execute: async (_sock, m, mantra) => {
        if (!m.isOwner) {
            await m.reply("Owner only command.");
            return;
        }

        const sub = String(m.args?.[0] || "").trim().toLowerCase();
        const arg = (m.args || []).slice(1).join(" ").trim().toLowerCase();
        const config = mantra.settings.antibadword || { enabled: false, words: [], action: DEFAULT_ACTION, warnMessage: DEFAULT_WARN_MSG };

        if (!sub) {
            const words = Array.isArray(config.words) ? config.words : [];
            await m.reply(
                `🚫 *Anti-Badword*\n\n` +
                `• Status: ${config.enabled ? "✅ ON" : "❌ OFF"}\n` +
                `• Action: *${config.action || DEFAULT_ACTION}*\n` +
                `• Words: ${words.length ? words.join(", ") : "_none set_"}\n\n` +
                `Usage:\n` +
                `• ${m.prefix}antibadword on|off\n` +
                `• ${m.prefix}antibadword add <word>\n` +
                `• ${m.prefix}antibadword remove <word>\n` +
                `• ${m.prefix}antibadword list\n` +
                `• ${m.prefix}antibadword action warn|delete|kick`
            );
            return;
        }

        if (sub === "list") {
            const words = Array.isArray(config.words) ? config.words : [];
            await m.reply(words.length ? `🚫 *Bad Words List:*\n${words.map((w, i) => `${i + 1}. ${w}`).join("\n")}` : "No bad words set.");
            return;
        }

        if (sub === "add") {
            if (!arg) return m.reply(`Usage: ${m.prefix}antibadword add <word>`);
            const words = Array.isArray(config.words) ? [...config.words] : [];
            if (words.includes(arg)) return m.reply(`"${arg}" is already in the list.`);
            words.push(arg);
            mantra.settings.antibadword = { ...config, words };
            mantra.saveSettings();
            return m.reply(`✅ Added "${arg}" to bad words list.`);
        }

        if (sub === "remove") {
            if (!arg) return m.reply(`Usage: ${m.prefix}antibadword remove <word>`);
            const words = Array.isArray(config.words) ? config.words.filter((w) => w !== arg) : [];
            mantra.settings.antibadword = { ...config, words };
            mantra.saveSettings();
            return m.reply(`✅ Removed "${arg}" from bad words list.`);
        }

        if (sub === "action") {
            if (!["warn", "delete", "kick"].includes(arg)) return m.reply("Actions: warn | delete | kick");
            mantra.settings.antibadword = { ...config, action: arg };
            mantra.saveSettings();
            return m.reply(`✅ Anti-Badword action set to: *${arg}*`);
        }

        if (!["on", "off"].includes(sub)) {
            return m.reply(`Usage: ${m.prefix}antibadword on|off|add|remove|list|action`);
        }

        mantra.settings.antibadword = { ...config, enabled: sub === "on" };
        mantra.saveSettings();
        return m.reply(`🚫 Anti-Badword is now ${mantra.settings.antibadword.enabled ? "✅ ON" : "❌ OFF"}`);
    }
};
