const { getGroupAdminState, getTargetFromMentionOrQuote, mentionTag } = require("../lib/groupTools");

module.exports = {
    name: "promote",
    react: "🔼",
    category: "group",
    description: "Promote a member to admin",
    usage: ",promote @user (or reply to user)",
    aliases: [],

    execute: async (sock, m) => {
        try {
            const state = await getGroupAdminState(sock, m);
            if (!state.ok) return m.reply(state.error);
            if (!state.botIsAdmin) return m.reply("Bot must be an admin to use this command.");
            if (!state.senderIsAdmin) return m.reply("You must be an admin to use this command.");

            const user = getTargetFromMentionOrQuote(m);
            if (!user) return m.reply("Please tag or reply to a user to promote.");

            await sock.groupParticipantsUpdate(m.from, [user], "promote");
            await sock.sendMessage(m.from, {
                text: `${mentionTag(user)} has been promoted to admin.`,
                mentions: [user]
            });
        } catch (e) {
            console.error("promote error:", e?.message || e);
            await m.reply(`${e?.message || e}`);
        }
    }
};
