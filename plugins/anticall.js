module.exports = {
    name: "anticall",
    react: "📵",
    category: "owner",
    description: "Auto-reject/block incoming voice and video calls",
    usage: ",anticall on|off|block",
    aliases: ["blockcall", "rejectcall", "callblock"],

    execute: async (_sock, m, mantra) => {
        if (!m.isOwner) {
            await m.reply("Owner only command.");
            return;
        }

        const state = String(m.args?.[0] || "").trim().toLowerCase();
        const current = mantra.settings.anticall || { enabled: false, block: false };

        if (!state) {
            await m.reply(
                `📵 *Anti-Call*\n\n` +
                `• Status: ${current.enabled ? "✅ ON" : "❌ OFF"}\n` +
                `• Mode: ${current.block ? "🚫 Block caller" : "🔄 Reject only"}\n\n` +
                `Usage:\n` +
                `• ${m.prefix}anticall on — reject calls only\n` +
                `• ${m.prefix}anticall block — reject & block caller\n` +
                `• ${m.prefix}anticall off — disable`
            );
            return;
        }

        if (state === "block") {
            mantra.settings.anticall = { enabled: true, block: true };
            mantra.saveSettings();
            await m.reply("📵 Anti-Call is now ✅ ON\nMode: 🚫 *Block caller* (callers will be blocked)");
            return;
        }

        if (!["on", "off"].includes(state)) {
            await m.reply(`Usage: ${m.prefix}anticall on|off|block`);
            return;
        }

        mantra.settings.anticall = { enabled: state === "on", block: current.block };
        mantra.saveSettings();
        await m.reply(`📵 Anti-Call is now ${mantra.settings.anticall.enabled ? "✅ ON" : "❌ OFF"}`);
    }
};
