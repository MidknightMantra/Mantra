const { getGroupAdminState, resolveTargetFromInput, mentionTag } = require("../lib/groupTools");

module.exports = {
    name: "reject",
    react: "❌",
    category: "group",
    description: "Reject a pending group join request",
    usage: ",reject <number|@user>",
    aliases: ["decline"],

    execute: async (sock, m) => {
        try {
            const state = await getGroupAdminState(sock, m);
            if (!state.ok) return m.reply(state.error);
            if (!state.botIsAdmin) return m.reply("Bot must be an admin to use this command.");
            if (!state.senderIsAdmin) return m.reply("You must be an admin to use this command.");

            const target = resolveTargetFromInput(m, state);
            if (!target) return m.reply("Please provide a user number to reject.");

            await sock.groupRequestParticipantsUpdate(m.from, [target], "reject");
            await sock.sendMessage(m.from, {
                text: `✅ ${mentionTag(target)} join request rejected.`,
                mentions: [target]
            });
        } catch (e) {
            console.error("reject error:", e?.message || e);
            await m.reply(`❌ Failed to reject request: ${e?.message || e}`);
        }
    }
};

