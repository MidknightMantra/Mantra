const { getGroupAdminState, resolveTargetFromInput, mentionTag, isSuperAdminParticipant } = require("../lib/groupTools");

module.exports = {
    name: "demote",
    react: "🔽",
    category: "group",
    description: "Demote an admin to member",
    usage: ",demote @user (or reply to user)",
    aliases: [],

    execute: async (sock, m) => {
        try {
            const state = await getGroupAdminState(sock, m);
            if (!state.ok) return m.reply(state.error);
            if (!state.botIsAdmin) return m.reply("Bot must be an admin to use this command.");
            if (!state.senderIsAdmin) return m.reply("You must be an admin to use this command.");

            const user = resolveTargetFromInput(m, state);
            if (!user) return m.reply("Please tag or reply to a user to demote.");
            if (user === state.botJid) return m.reply("I cannot demote myself.");

            const entry = state.byJid.get(user);
            if (!entry?.admin) return m.reply(`${mentionTag(user)} is not an admin.`);
            if (isSuperAdminParticipant(entry)) {
                return m.reply(`${mentionTag(user)} is the group owner and cannot be demoted.`);
            }

            await sock.groupParticipantsUpdate(m.from, [user], "demote");
            await sock.sendMessage(m.from, {
                text: `${mentionTag(user)} has been demoted to member.`,
                mentions: [user]
            });
        } catch (e) {
            console.error("demote error:", e?.message || e);
            await m.reply(`${e?.message || e}`);
        }
    }
};
