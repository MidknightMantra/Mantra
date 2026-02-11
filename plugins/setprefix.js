module.exports = {
    name: "setprefix",
    react: "🪄",
    category: "owner",
    description: "Set the bot command prefix",
    usage: ",setprefix <symbol>",
    aliases: ["prefix"],

    execute: async (_sock, m, mantra) => {
        if (!m.isOwner) {
            await m.reply("Owner only command.");
            return;
        }

        const text = String(m.args?.join("") || "").trim();
        if (!text) {
            await m.reply("No symbol detected ...");
            return;
        }

        const symbolRegex = /^[^\w\s]$/u;
        if (!symbolRegex.test(text)) {
            await m.reply("Invalid symbol input. Please provide exactly one symbol as a prefix.");
            return;
        }

        if (typeof mantra.setPrefix === "function") {
            mantra.setPrefix(text);
        } else {
            mantra.prefix = text;
        }

        await m.reply(`the prefix has been changed to *${text}*`);
    }
};
