module.exports = {
    name: "jid",
    react: "🤖",
    category: "owner",
    description: "Get the bot JID",
    usage: ",jid",
    aliases: [],

    execute: async (sock, m) => {
        if (!m.isOwner) {
            await m.reply("You are not the owner.");
            return;
        }

        await m.reply(`Bot JID: ${sock.user.id}`);
    }
};
