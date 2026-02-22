const { getGroupAdminState } = require("../lib/groupTools");

module.exports = {
    name: "opengc",
    react: "\u{1F513}",
    category: "group",
    description: "Open group so all members can send messages",
    usage: ",opengc",
    aliases: ["open", "groupopen", "unmutegc", "gcopen", "adminonly", "adminsonly"],

    execute: async (sock, m) => {
        try {
            const state = await getGroupAdminState(sock, m);
            if (!state.ok) return m.reply(state.error);
            if (!state.botIsAdmin) return m.reply("Bot must be an admin to use this command.");
            if (!state.senderIsAdmin) return m.reply("You must be an admin to use this command.");

            await sock.groupSettingUpdate(m.from, "not_announcement");
            await m.reply("\u{1F513} Group is now open. Everyone can send messages.");
        } catch (e) {
            console.error("opengc error:", e?.message || e);
            await m.reply(`${e?.message || e}`);
        }
    }
};
