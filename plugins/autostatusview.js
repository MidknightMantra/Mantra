module.exports = {
    name: "autostatusview",
    react: "👁️",
    category: "owner",
    description: "Toggle auto-viewing WhatsApp statuses",
    usage: ",autostatusview on|off",
    aliases: ["statusview", "autostatus", "statusauto"],

    execute: async (_sock, m, mantra) => {
        if (!m.isOwner) {
            await m.reply("Owner only command.");
            return;
        }

        const state = String(m.args?.[0] || "").trim().toLowerCase();
        const current = mantra.settings.autostatusview !== false;

        if (!state) {
            await m.reply(
                `Auto Status View is ${current ? "ON" : "OFF"}\nUsage: ${m.prefix}autostatusview on|off`
            );
            return;
        }

        if (!["on", "off"].includes(state)) {
            await m.reply(`Usage: ${m.prefix}autostatusview on|off`);
            return;
        }

        mantra.settings.autostatusview = state === "on";
        mantra.saveSettings();
        await m.reply(`Auto Status View is now ${mantra.settings.autostatusview ? "ON" : "OFF"}`);
    }
};
