const { getGroupAdminState } = require("../lib/groupTools");

module.exports = {
    name: "closegc",
    react: "\u{1F512}",
    category: "group",
    description: "Close group so only admins can send messages",
    usage: ",closegc",
    aliases: ["close", "groupclose", "mutegc", "groupmute", "gcmute", "gcclose"],

    execute: async (sock, m) => {
        try {
            const state = await getGroupAdminState(sock, m);
            if (!state.ok) return m.reply(state.error);
            if (!state.botIsAdmin) return m.reply("Bot must be an admin to use this command.");
            if (!state.senderIsAdmin) return m.reply("You must be an admin to use this command.");

            await sock.groupSettingUpdate(m.from, "announcement");
            await m.reply("\u{1F512} Group is now closed. Only admins can send messages.");
        } catch (e) {
            console.error("closegc error:", e?.message || e);
            await m.reply(`${e?.message || e}`);
        }
    }
};
