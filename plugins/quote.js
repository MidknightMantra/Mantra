const axios = require("axios");

const DEFAULT_QUOTES_ENDPOINT = "https://api.giftedtech.co.ke/api/fun/quotes";
const DEFAULT_GIFTED_KEY = "gifted";

function getApiKey() {
    return String(process.env.AI_API_KEY || process.env.GIFTED_API_KEY || "").trim() || DEFAULT_GIFTED_KEY;
}

function buildGiftedUrl() {
    const endpoint = String(process.env.GIFTED_QUOTES_ENDPOINT || "").trim() || DEFAULT_QUOTES_ENDPOINT;
    const url = new URL(endpoint);
    if (!url.searchParams.get("apikey")) {
        url.searchParams.set("apikey", getApiKey());
    }
    return url.toString();
}

async function fetchFromGiftedQuotes() {
    const { data } = await axios.get(buildGiftedUrl(), { timeout: 15000 });
    const content = String(data?.result || "").trim();
    if (!content) return null;
    return {
        content,
        author: "Unknown"
    };
}

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
    react: "\u{1F4AC}",
    category: "fun",
    description: "Get a random inspiring quote",
    usage: ",quote",
    aliases: ["inspire", "motivate", "quotes"],

    execute: async (_sock, m) => {
        const providers = [
            ["gifted", fetchFromGiftedQuotes],
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

        const author = String(quote.author || "Unknown").trim();
        const message = `\u{1F4AC} "${quote.content}"\n- ${author}`;
        await m.reply(message);
    }
};
