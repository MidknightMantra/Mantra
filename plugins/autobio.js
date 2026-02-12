module.exports = {
    name: "autobio",
    react: "🧬",
    category: "owner",
    description: "Toggle automatic profile status updates",
    usage: ",autobio on|off",
    aliases: ["bioloop", "statusloop"],

    execute: async (_sock, m, mantra) => {
        if (!m.isOwner) {
            await m.reply("Owner only command.");
            return;
        }

        const arg = String(m.args?.[0] || "").trim().toLowerCase();
        const current = Boolean(mantra?.settings?.autobio);

        if (!arg) {
            await m.reply(
                `AutoBio is ${current ? "ON" : "OFF"}\n` +
                `Timezone: ${String(mantra?.settings?.timezone || "UTC")}\n` +
                `Usage: ${m.prefix}autobio on|off`
            );
            return;
        }

        if (!["on", "off"].includes(arg)) {
            await m.reply(`Usage: ${m.prefix}autobio on|off`);
            return;
        }

        mantra.settings.autobio = arg === "on";
        mantra.saveSettings();

        if (mantra.settings.autobio && typeof mantra.refreshAutoBio === "function") {
            await mantra.refreshAutoBio();
        }

        await m.reply(`AutoBio is now ${mantra.settings.autobio ? "ON" : "OFF"}`);
    }
};
