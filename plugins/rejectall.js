const { getGroupAdminState } = require("../lib/groupTools");

module.exports = {
    name: "rejectall",
    react: "❌",
    category: "group",
    description: "Reject all pending group join requests",
    usage: ",rejectall",
    aliases: ["declineall"],

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

            const jids = pending.map((p) => p.jid).filter(Boolean);
            await sock.groupRequestParticipantsUpdate(m.from, jids, "reject");
            await m.reply(`✅ Rejected ${jids.length} pending join request(s).`);
        } catch (e) {
            console.error("rejectall error:", e?.message || e);
            await m.reply(`❌ Failed to reject all requests: ${e?.message || e}`);
        }
    }
};

