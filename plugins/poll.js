module.exports = {
    name: "poll",
    react: "📊",
    category: "group",
    description: "Create a WhatsApp poll",
    usage: ",poll Question | Option 1 | Option 2",
    aliases: ["mkpoll"],

    execute: async (sock, m) => {
        const raw = String(m.args?.join(" ") || "").trim();
        if (!raw.includes("|")) {
            await m.reply(`Usage: ${m.prefix}poll Question | Option 1 | Option 2`);
            return;
        }

        const parts = raw.split("|").map((x) => String(x || "").trim()).filter(Boolean);
        if (parts.length < 3) {
            await m.reply("Poll needs a question and at least 2 options.");
            return;
        }

        const [question, ...options] = parts;
        await sock.sendMessage(m.from, {
            poll: {
                name: question,
                values: options,
                selectableCount: 1
            }
        });
    }
};
