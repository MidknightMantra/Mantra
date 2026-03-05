const PRESENCE_TYPES = ["available", "composing", "recording", "paused", "unavailable"];
const VALID_MODES = ["online", "typing", "recording", "offline"];

const MODE_TO_PRESENCE = {
    online: "available",
    typing: "composing",
    recording: "recording",
    offline: "unavailable"
};

let presenceTimer = null;

module.exports = {
    name: "presence",
    react: "🟢",
    category: "owner",
    description: "Set bot presence (online, typing, recording, or offline)",
    usage: ",presence online|typing|recording|offline|auto",
    aliases: ["setonline", "gifpresence", "setpresence"],

    onInit: async (sock, mantra) => {
        // On reconnect, restore presence if auto mode was enabled
        const config = mantra.settings?.presence || {};
        if (config.auto && config.mode) {
            try {
                const presenceType = MODE_TO_PRESENCE[config.mode] || "available";
                await sock.sendPresenceUpdate(presenceType);
                console.log(`[presence] restored auto mode: ${config.mode}`);
            } catch { }
        }
    },

    execute: async (sock, m, mantra) => {
        if (!m.isOwner) {
            await m.reply("Owner only command.");
            return;
        }

        const sub = String(m.args?.[0] || "").trim().toLowerCase();
        const config = mantra.settings?.presence || { mode: "online", auto: false };

        if (!sub) {
            await m.reply(
                `🟢 *Gifted Presence*\n\n` +
                `• Current: *${config.mode || "online"}*\n` +
                `• Auto: ${config.auto ? "✅ ON" : "❌ OFF"}\n\n` +
                `Modes:\n` +
                `• ${m.prefix}presence online — always appear online\n` +
                `• ${m.prefix}presence typing — appear as typing\n` +
                `• ${m.prefix}presence recording — appear as recording\n` +
                `• ${m.prefix}presence offline — go offline\n` +
                `• ${m.prefix}presence auto — auto-switch (online with typing on messages)`
            );
            return;
        }

        if (sub === "auto") {
            mantra.settings.presence = { ...config, auto: true, mode: "online" };
            mantra.saveSettings();

            if (presenceTimer) clearInterval(presenceTimer);
            presenceTimer = setInterval(async () => {
                try { await sock.sendPresenceUpdate("available"); } catch { }
            }, 30000);

            try { await sock.sendPresenceUpdate("available"); } catch { }
            return m.reply("🟢 Presence set to *auto* — will stay online and show activity naturally.");
        }

        if (!VALID_MODES.includes(sub)) {
            return m.reply(`Invalid mode. Use: ${VALID_MODES.join(" | ")}`);
        }

        if (presenceTimer) {
            clearInterval(presenceTimer);
            presenceTimer = null;
        }

        mantra.settings.presence = { mode: sub, auto: sub === "online" };
        mantra.saveSettings();

        const presenceType = MODE_TO_PRESENCE[sub] || "available";
        try {
            await sock.sendPresenceUpdate(presenceType);
        } catch (e) {
            console.error("[presence] sendPresenceUpdate failed:", e?.message || e);
        }

        // If set to "online", keep refreshing every 30s
        if (sub === "online") {
            if (presenceTimer) clearInterval(presenceTimer);
            presenceTimer = setInterval(async () => {
                try { await sock.sendPresenceUpdate("available"); } catch { }
            }, 30000);
        }

        const icons = { online: "🟢", typing: "⌨️", recording: "🎙️", offline: "⚫" };
        await m.reply(`${icons[sub] || "🟢"} Presence set to *${sub}*`);
    }
};
