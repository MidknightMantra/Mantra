const { getGroupAdminState, mentionTag, normalizeJid } = require("../lib/groupTools");

module.exports = {
    name: "listrequests",
    react: "📋",
    category: "group",
    description: "List pending group join requests",
    usage: ",listrequests",
    aliases: ["joinrequests", "pendingrequests"],

    execute: async (sock, m) => {
        try {
            const state = await getGroupAdminState(sock, m);
            if (!state.ok) return m.reply(state.error);
            if (!state.botIsAdmin) return m.reply("Bot must be an admin to use this command.");
            if (!state.senderIsAdmin) return m.reply("You must be an admin to use this command.");

            const pending = await sock.groupRequestParticipantsList(m.from);
            if (!Array.isArray(pending) || pending.length === 0) {
                await m.reply("📭 No pending join requests.");
                return;
            }

            const jids = pending.map((p) => normalizeJid(p.jid)).filter(Boolean);
            const lines = jids.map((jid, i) => `${i + 1}. ${mentionTag(jid)}`);

            await sock.sendMessage(m.from, {
                text: `📋 *Pending Join Requests* (${jids.length})\n\n${lines.join("\n")}`,
                mentions: jids
            });
        } catch (e) {
            console.error("listrequests error:", e?.message || e);
            await m.reply(`❌ Failed to list requests: ${e?.message || e}`);
        }
    }
};

