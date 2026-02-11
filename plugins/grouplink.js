const { getGroupAdminState } = require("../lib/groupTools");

module.exports = {
    name: "grouplink",
    react: "\u{1F517}",
    category: "group",
    description: "Get the current group invite link",
    usage: ",grouplink",
    aliases: ["linkgc", "gc_link", "invitelink", "link", "gclink"],

    execute: async (sock, m) => {
        try {
            const state = await getGroupAdminState(sock, m);
            if (!state.ok) return m.reply(state.error);
            if (!state.botIsAdmin) return m.reply("Bot must be an admin to use this command.");
            if (!state.senderIsAdmin) return m.reply("You must be an admin to use this command.");

            const code = await sock.groupInviteCode(m.from);
            if (!code) {
                await m.reply("Could not fetch the group link right now.");
                return;
            }

            const link = `https://chat.whatsapp.com/${code}`;
            await m.reply(`\u{1F517} *Group Link*\n\n${link}`);
        } catch (e) {
            console.error("grouplink error:", e?.message || e);
            await m.reply(`${e?.message || e}`);
        }
    }
};
