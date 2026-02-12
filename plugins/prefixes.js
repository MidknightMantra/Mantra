module.exports = {
    name: "prefixes",
    react: "🔤",
    category: "main",
    description: "Show the active command prefix",
    usage: ",prefixes",
    aliases: ["prefixlist", "allprefixes"],

    execute: async (_sock, m) => {
        const currentPrefix = String(m.prefix || ",").trim() || ",";
        await m.reply(
            `Active prefix: *${currentPrefix}*\n` +
            `This bot currently accepts one active prefix at a time.\n` +
            `Use *${currentPrefix}setprefix <symbol>* to change it.`
        );
    }
};
