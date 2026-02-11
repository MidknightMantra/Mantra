const { getGroupAdminState, resolveTargetFromInput, mentionTag } = require("../lib/groupTools");

module.exports = {
    name: "accept",
    react: "✅",
    category: "group",
    description: "Approve a pending group join request",
    usage: ",accept <number|@user>",
    aliases: ["approve"],

    execute: async (sock, m) => {
        try {
            const state = await getGroupAdminState(sock, m);
            if (!state.ok) return m.reply(state.error);
            if (!state.botIsAdmin) return m.reply("Bot must be an admin to use this command.");
            if (!state.senderIsAdmin) return m.reply("You must be an admin to use this command.");

            const target = resolveTargetFromInput(m, state);
            if (!target) return m.reply("Please provide a user number to approve.");

            await sock.groupRequestParticipantsUpdate(m.from, [target], "approve");
            await sock.sendMessage(m.from, {
                text: `✅ ${mentionTag(target)} join request approved.`,
                mentions: [target]
            });
        } catch (e) {
            console.error("accept error:", e?.message || e);
            await m.reply(`❌ Failed to approve request: ${e?.message || e}`);
        }
    }
};

