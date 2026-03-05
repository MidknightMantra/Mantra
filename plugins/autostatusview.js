module.exports = {
    name: "autostatusview",
    react: "👁️",
    category: "owner",
    description: "Toggle auto-viewing WhatsApp statuses",
    usage: ",autostatusview on|off|count|reset",
    aliases: ["statusview", "autostatus", "statusauto"],

    execute: async (_sock, m, mantra) => {
        if (!m.isOwner) {
            await m.reply("Owner only command.");
            return;
        }

        const state = String(m.args?.[0] || "").trim().toLowerCase();
        const current = mantra.settings.autostatusview !== false;
        const viewCount = mantra.statusViewCount || 0;

        if (!state) {
            await m.reply(
                `👁️ *Auto Status View*\n\n` +
                `• Status: ${current ? "✅ ON" : "❌ OFF"}\n` +
                `• Viewed this session: *${viewCount}*\n\n` +
                `Usage:\n` +
                `• ${m.prefix}autostatusview on|off\n` +
                `• ${m.prefix}autostatusview count\n` +
                `• ${m.prefix}autostatusview reset`
            );
            return;
        }

        if (state === "count") {
            await m.reply(
                `👁️ *Status View Count*\n\n` +
                `Statuses viewed this session: *${viewCount}*`
            );
            return;
        }

        if (state === "reset") {
            mantra.statusViewCount = 0;
            await m.reply("✅ Status view counter reset to 0.");
            return;
        }

        if (!["on", "off"].includes(state)) {
            await m.reply(`Usage: ${m.prefix}autostatusview on|off|count|reset`);
            return;
        }

        mantra.settings.autostatusview = state === "on";
        mantra.saveSettings();
        await m.reply(
            `👁️ Auto Status View is now ${mantra.settings.autostatusview ? "✅ ON" : "❌ OFF"}`
        );
    }
};
