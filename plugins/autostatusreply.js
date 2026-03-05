module.exports = {
    name: "autostatusreply",
    react: "💬",
    category: "owner",
    description: "Auto-reply to WhatsApp status updates with custom text",
    usage: ",autostatusreply on|off|set <text>",
    aliases: ["statusreply", "statusautoreply", "autoreplystat"],

    execute: async (_sock, m, mantra) => {
        if (!m.isOwner) {
            await m.reply("Owner only command.");
            return;
        }

        const state = String(m.args?.[0] || "").trim().toLowerCase();
        const current = mantra.settings.autostatusreply || { enabled: false, text: "" };

        if (!state) {
            await m.reply(
                `💬 *Auto Status Reply*\n\n` +
                `• Status: ${current.enabled ? "✅ ON" : "❌ OFF"}\n` +
                `• Reply text: ${current.text ? `"${current.text}"` : "_not set_"}\n\n` +
                `Usage:\n` +
                `• ${m.prefix}autostatusreply on|off\n` +
                `• ${m.prefix}autostatusreply set <your reply text>`
            );
            return;
        }

        if (state === "set") {
            const text = (m.args || []).slice(1).join(" ").trim();
            if (!text) {
                await m.reply(`Usage: ${m.prefix}autostatusreply set <your reply text>`);
                return;
            }

            mantra.settings.autostatusreply = {
                enabled: current.enabled,
                text
            };
            mantra.saveSettings();
            await m.reply(`✅ Status reply text set to: "${text}"`);
            return;
        }

        if (!["on", "off"].includes(state)) {
            await m.reply(`Usage: ${m.prefix}autostatusreply on|off|set <text>`);
            return;
        }

        if (state === "on" && !current.text) {
            await m.reply(
                `⚠️ Set a reply text first:\n${m.prefix}autostatusreply set <your reply text>`
            );
            return;
        }

        mantra.settings.autostatusreply = {
            enabled: state === "on",
            text: current.text
        };
        mantra.saveSettings();
        await m.reply(
            `💬 Auto Status Reply is now ${mantra.settings.autostatusreply.enabled ? "✅ ON" : "❌ OFF"}` +
            (mantra.settings.autostatusreply.text ? `\nReply: "${mantra.settings.autostatusreply.text}"` : "")
        );
    }
};
