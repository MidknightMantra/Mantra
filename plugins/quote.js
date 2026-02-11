const axios = require("axios");

async function fetchFromZenQuotes() {
    const { data } = await axios.get("https://zenquotes.io/api/random", { timeout: 12000 });
    const first = Array.isArray(data) ? data[0] : null;
    if (!first?.q) return null;
    return {
        content: String(first.q).trim(),
        author: String(first.a || "Unknown").trim()
    };
}

async function fetchFromQuotable() {
    const { data } = await axios.get("https://api.quotable.io/random", { timeout: 12000 });
    if (!data?.content) return null;
    return {
        content: String(data.content).trim(),
        author: String(data.author || "Unknown").trim()
    };
}

module.exports = {
    name: "quote",
    react: "💬",
    category: "fun",
    description: "Get a random inspiring quote",
    usage: ",quote",
    aliases: ["inspire", "motivate"],

    execute: async (_sock, m) => {
        const providers = [
            ["zenquotes", fetchFromZenQuotes],
            ["quotable", fetchFromQuotable]
        ];

        let quote = null;
        const errors = [];

        for (const [name, fn] of providers) {
            try {
                quote = await fn();
                if (quote?.content) break;
                errors.push(`${name}: empty response`);
            } catch (e) {
                errors.push(`${name}: ${e?.code || e?.message || "request failed"}`);
            }
        }

        if (!quote?.content) {
            console.error("quote error:", errors.join(" | "));
            await m.reply("Could not fetch a quote right now. Please try again later.");
            return;
        }

        const botName = process.env.BOT_NAME || "MANTRA";
        const message = `
💬 "${quote.content}"
- ${quote.author}

> *${botName} QUOTES*
`;

        await m.reply(message.trim());
    }
};
