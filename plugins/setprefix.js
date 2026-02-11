function digits(value) {
    return String(value || "").replace(/\D/g, "");
}

function jidUser(value) {
    const raw = String(value || "");
    const beforeAt = raw.split("@")[0];
    return beforeAt.split(":")[0];
}

function isOwnerSender(m, sock) {
    if (m.isOwner) return true;

    const configuredOwner = digits(process.env.OWNER_NUMBER || process.env.BOT_OWNER_NUMBER);
    if (!configuredOwner) return false;

    const senderDigits = digits(jidUser(m.sender));
    return senderDigits === configuredOwner;
}

module.exports = {
    name: "setprefix",
    category: "owner",
    description: "Set the bot command prefix",
    usage: ",setprefix <symbol>",
    aliases: ["prefix"],

    execute: async (sock, m, mantra) => {
        if (!isOwnerSender(m, sock)) {
            await m.reply("Owner only command.");
            return;
        }

        const text = String(m.args?.join("") || "").trim();
        if (!text) {
            await m.reply(`No symbol detected. Usage: ${m.prefix}setprefix <symbol>`);
            return;
        }

        const symbolRegex = /^[^\w\s]$/u;
        if (!symbolRegex.test(text)) {
            await m.reply("Invalid symbol input. Provide exactly one symbol as prefix.");
            return;
        }

        if (typeof mantra.setPrefix === "function") {
            mantra.setPrefix(text);
        } else {
            mantra.prefix = text;
        }

        await m.reply(`The prefix has been changed to *${text}*`);
    }
};
