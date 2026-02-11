const { getGroupAdminState, resolveTargetFromInput, mentionTag, isSuperAdminParticipant } = require("../lib/groupTools");

module.exports = {
    name: "promote",
    react: "🔼",
    category: "group",
    description: "Promote a member to admin",
    usage: ",promote @user (or reply to user)",
    aliases: ["toadmin"],

    execute: async (sock, m) => {
        try {
            const state = await getGroupAdminState(sock, m);
            if (!state.ok) return m.reply(state.error);
            if (!state.botIsAdmin) return m.reply("Bot must be an admin to use this command.");
            if (!state.senderIsAdmin) return m.reply("You must be an admin to use this command.");

            const user = resolveTargetFromInput(m, state);
            if (!user) return m.reply("Please tag or reply to a user to promote.");
            if (user === state.botJid) return m.reply("I cannot promote myself.");

            const entry = state.byJid.get(user);
            if (entry?.admin) {
                if (isSuperAdminParticipant(entry)) {
                    return m.reply(`${mentionTag(user)} is the group owner and already admin.`);
                }
                return m.reply(`${mentionTag(user)} is already an admin.`);
            }

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
