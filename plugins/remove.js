const { getGroupAdminState, getTargetFromMentionOrQuote, mentionTag } = require("../lib/groupTools");

module.exports = {
    name: "remove",
    react: "🚫",
    category: "group",
    description: "Remove a member from the group",
    usage: ",remove @user (or reply to user)",
    aliases: ["kick"],

    execute: async (sock, m) => {
        try {
            const state = await getGroupAdminState(sock, m);
            if (!state.ok) return m.reply(state.error);
            if (!state.botIsAdmin) return m.reply("Bot must be an admin to use this command.");
            if (!state.senderIsAdmin) return m.reply("You must be an admin to use this command.");

            const user = getTargetFromMentionOrQuote(m);
            if (!user) return m.reply("Please tag or reply to a user to remove.");
            if (user === state.botJid) return m.reply("I cannot remove myself.");

            await sock.groupParticipantsUpdate(m.from, [user], "remove");
            await sock.sendMessage(m.from, {
                text: `${mentionTag(user)} has been removed from the group.`,
                mentions: [user]
            });
        } catch (e) {
            console.error("remove error:", e?.message || e);
            await m.reply(`${e?.message || e}`);
        }
    }
};
