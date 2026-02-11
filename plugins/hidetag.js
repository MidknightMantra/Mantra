const { getGroupAdminState } = require("../lib/groupTools");

module.exports = {
    name: "hidetag",
    react: "📢",
    category: "group",
    description: "Send message while secretly mentioning everyone",
    usage: ",hidetag <message> (or reply to a message)",
    aliases: ["htag", "hidden", "hidtag"],

    execute: async (sock, m) => {
        try {
            const state = await getGroupAdminState(sock, m);
            if (!state.ok) return m.reply(state.error);
            if (!state.senderIsAdmin && !m.isOwner) return m.reply("Admin/owner only command.");

            const typed = String(m.args?.join(" ") || "").trim();
            const quotedText =
                m.quoted?.conversation ||
                m.quoted?.extendedTextMessage?.text ||
                m.quoted?.imageMessage?.caption ||
                m.quoted?.videoMessage?.caption ||
                "";

            const text = typed || String(quotedText || "").trim();
            if (!text) return m.reply("Please provide a message or reply to one.");

            const mentions = state.participants.map((p) => p.id).filter(Boolean);
            await sock.sendMessage(m.from, { text, mentions });
        } catch (e) {
            console.error("hidetag error:", e?.message || e);
            await m.reply(`❌ Failed to send hidetag: ${e?.message || e}`);
        }
    }
};

