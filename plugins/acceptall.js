const { getGroupAdminState } = require("../lib/groupTools");

module.exports = {
    name: "acceptall",
    react: "✅",
    category: "group",
    description: "Approve all pending group join requests",
    usage: ",acceptall",
    aliases: ["approveall"],

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
            await sock.groupRequestParticipantsUpdate(m.from, jids, "approve");
            await m.reply(`✅ Approved ${jids.length} pending join request(s).`);
        } catch (e) {
            console.error("acceptall error:", e?.message || e);
            await m.reply(`❌ Failed to approve all requests: ${e?.message || e}`);
        }
    }
};

