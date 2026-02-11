module.exports = {
    name: "left",
    react: "👋",
    category: "group",
    description: "Make bot leave current group (owner only)",
    usage: ",left",
    aliases: ["leave", "exitgroup", "exitgc"],

    execute: async (sock, m) => {
        try {
            if (!m.isGroup) return m.reply("This command only works in groups.");
            if (!m.isOwner) return m.reply("Owner only command.");

            await m.reply("👋 Leaving this group...");
            await sock.groupLeave(m.from);
        } catch (e) {
            console.error("left error:", e?.message || e);
            await m.reply(`❌ Failed to leave group: ${e?.message || e}`);
        }
    }
};

