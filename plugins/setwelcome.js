const { getGroupAdminState } = require("../lib/groupTools");

const DEFAULT_ALIVE_IMAGE = "https://files.catbox.moe/2evo2f.jpg";

module.exports = {
    name: "setwelcome",
    react: "👋",
    category: "group",
    description: "Set the welcome message for the group",
    usage: ",setwelcome <message>",
    aliases: [],

    execute: async (sock, m) => {
        try {
            const state = await getGroupAdminState(sock, m);
            if (!state.ok) return m.reply(state.error);
            if (!state.botIsAdmin) return m.reply("Bot must be an admin to use this command.");
            if (!state.senderIsAdmin) return m.reply("You must be an admin to use this command.");

            const welcome = String(m.args?.join(" ") || "").trim();
            if (!welcome) return m.reply("Please provide a welcome message.");

            const aliveImg = String(process.env.ALIVE_IMG || "").trim() || DEFAULT_ALIVE_IMAGE;
            await sock.sendMessage(m.from, { image: { url: aliveImg }, caption: welcome });
            await m.reply("Welcome message has been set.");
        } catch (e) {
            console.error("setwelcome error:", e?.message || e);
            await m.reply(`${e?.message || e}`);
        }
    }
};
