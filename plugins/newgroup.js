module.exports = {
    name: "newgroup",
    react: "🆕",
    category: "group",
    description: "Create a new group with you as initial member",
    usage: ",newgroup <group name>",
    aliases: ["newgc", "creategroup"],

    execute: async (sock, m) => {
        try {
            if (!m.isOwner) return m.reply("Owner only command.");

            const subject = String(m.args?.join(" ") || "").trim();
            if (!subject) return m.reply("Please provide a group name.");

            const created = await sock.groupCreate(subject, [m.sender]);
            const code = await sock.groupInviteCode(created.id);
            const link = code ? `https://chat.whatsapp.com/${code}` : "Unavailable";

            await m.reply(
                `🆕 *Group created successfully*\n\n*Name:* ${subject}\n*ID:* ${created.id}\n*Link:* ${link}`
            );
        } catch (e) {
            console.error("newgroup error:", e?.message || e);
            await m.reply(`❌ Failed to create group: ${e?.message || e}`);
        }
    }
};

