const { getGroupAdminState } = require("../lib/groupTools");
const { setGroupSetting } = require("../lib/groupSettings");

const DEFAULT_ALIVE_IMAGE = "https://files.catbox.moe/2evo2f.jpg";

module.exports = {
    name: "setgoodbye",
    react: "👋",
    category: "group",
    description: "Set the goodbye message for the group",
    usage: ",setgoodbye <message>",
    aliases: [],

    execute: async (sock, m) => {
        try {
            const state = await getGroupAdminState(sock, m);
            if (!state.ok) return m.reply(state.error);
            if (!state.botIsAdmin) return m.reply("Bot must be an admin to use this command.");
            if (!state.senderIsAdmin) return m.reply("You must be an admin to use this command.");

            const goodbye = String(m.args?.join(" ") || "").trim();
            if (!goodbye) return m.reply("Please provide a goodbye message.");
            setGroupSetting(m.from, "GOODBYE_TEXT", goodbye);
            setGroupSetting(m.from, "GOODBYE_ENABLED", true);

            const aliveImg = String(process.env.ALIVE_IMG || "").trim() || DEFAULT_ALIVE_IMAGE;
            await sock.sendMessage(m.from, { image: { url: aliveImg }, caption: goodbye });
            await m.reply("Goodbye message saved and enabled.");
        } catch (e) {
            console.error("setgoodbye error:", e?.message || e);
            await m.reply(`${e?.message || e}`);
        }
    }
};
