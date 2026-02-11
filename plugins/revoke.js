const { getGroupAdminState } = require("../lib/groupTools");

module.exports = {
    name: "revoke",
    react: "\u{1F6E1}",
    category: "group",
    description: "Reset group invite link",
    usage: ",revoke",
    aliases: ["resetlink", "revokelink", "resetgclink", "resetgrouplink", "newlink"],

    execute: async (sock, m) => {
        try {
            const state = await getGroupAdminState(sock, m);
            if (!state.ok) return m.reply(state.error);
            if (!state.botIsAdmin) return m.reply("Bot must be an admin to use this command.");
            if (!state.senderIsAdmin) return m.reply("You must be an admin to use this command.");

            const newCode = await sock.groupRevokeInvite(m.from);
            if (!newCode) {
                await m.reply("Invite link was revoked, but new code could not be fetched.");
                return;
            }

            const newLink = `https://chat.whatsapp.com/${newCode}`;
            await m.reply(`\u{1F6E1} *Invite link reset successfully.*\n\n*New Link:* ${newLink}`);
        } catch (e) {
            console.error("revoke error:", e?.message || e);
            await m.reply(`${e?.message || e}`);
        }
    }
};
