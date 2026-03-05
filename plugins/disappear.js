module.exports = {
    name: "disappear",
    react: "⏳",
    category: "group",
    description: "Toggle disappearing messages in the current chat",
    usage: ",disappear on|off|24h|7d|90d",
    aliases: ["ephemeral", "disappearing", "vanish"],

    execute: async (sock, m) => {
        if (!m.isOwner) {
            await m.reply("Owner only command.");
            return;
        }

        const sub = String(m.args?.[0] || "").trim().toLowerCase();

        // Ephemeral durations (in seconds) supported by WhatsApp
        const DURATIONS = {
            "on": 86400,       // default: 24 hours
            "24h": 86400,      // 24 hours
            "7d": 604800,      // 7 days
            "90d": 7776000,    // 90 days
            "off": 0           // disable
        };

        if (!sub) {
            await m.reply(
                `⏳ *Disappearing Messages*\n\n` +
                `Usage:\n` +
                `• ${m.prefix}disappear on — 24 hours\n` +
                `• ${m.prefix}disappear 24h — 24 hours\n` +
                `• ${m.prefix}disappear 7d — 7 days\n` +
                `• ${m.prefix}disappear 90d — 90 days\n` +
                `• ${m.prefix}disappear off — disable\n\n` +
                `Works in groups and DMs.`
            );
            return;
        }

        if (!(sub in DURATIONS)) {
            await m.reply(`Invalid option. Use: ${Object.keys(DURATIONS).join(" | ")}`);
            return;
        }

        const ephemeralExpiration = DURATIONS[sub];

        try {
            // Method 1: sendMessage with disappearingMessagesInChat
            await sock.sendMessage(m.from, {
                disappearingMessagesInChat: ephemeralExpiration || false
            });

            if (ephemeralExpiration > 0) {
                const label = sub === "on" ? "24h" : sub;
                await m.reply(`⏳ Disappearing messages set to *${label}*`);
            } else {
                await m.reply("⏳ Disappearing messages *disabled*");
            }
        } catch (err) {
            console.error("[disappear] error:", err?.message || err);

            // Method 2: chatModify fallback
            try {
                if (typeof sock.chatModify === "function") {
                    await sock.chatModify(
                        { disappearingMessages: { ephemeralExpiration } },
                        m.from
                    );
                    if (ephemeralExpiration > 0) {
                        await m.reply(`⏳ Disappearing messages set to *${sub}*`);
                    } else {
                        await m.reply("⏳ Disappearing messages *disabled*");
                    }
                    return;
                }
            } catch (err2) {
                console.error("[disappear] chatModify error:", err2?.message || err2);
            }

            await m.reply(`❌ Failed to set disappearing messages: ${err?.message || "Unknown error"}`);
        }
    }
};
