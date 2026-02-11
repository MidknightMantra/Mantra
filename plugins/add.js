const { getGroupAdminState, toUserJid, mentionTag } = require("../lib/groupTools");

module.exports = {
    name: "add",
    react: "➕",
    category: "group",
    description: "Add a member to the group",
    usage: ",add <phone_number>",
    aliases: ["invite"],

    execute: async (sock, m) => {
        try {
            const state = await getGroupAdminState(sock, m);
            if (!state.ok) return m.reply(state.error);
            if (!state.botIsAdmin) return m.reply("Bot must be an admin to use this command.");
            if (!state.senderIsAdmin) return m.reply("You must be an admin to use this command.");

            const input = String(m.args?.[0] || "").trim();
            if (!input) return m.reply("Please provide a phone number to add.");

            const user = toUserJid(input);
            if (!user) return m.reply("Invalid phone number.");

            await sock.groupParticipantsUpdate(m.from, [user], "add");
            await sock.sendMessage(m.from, {
                text: `${mentionTag(user)} has been added to the group.`,
                mentions: [user]
            });
        } catch (e) {
            console.error("add error:", e?.message || e);
            await m.reply(`${e?.message || e}`);
        }
    }
};
