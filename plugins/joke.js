const axios = require("axios");

const DEFAULT_JOKE_ENDPOINT = "https://api.giftedtech.co.ke/api/fun/jokes";
const DEFAULT_GIFTED_KEY = "gifted";

function getApiKey() {
    return String(process.env.AI_API_KEY || process.env.GIFTED_API_KEY || "").trim() || DEFAULT_GIFTED_KEY;
}

function buildGiftedUrl() {
    const endpoint = String(process.env.GIFTED_JOKES_ENDPOINT || "").trim() || DEFAULT_JOKE_ENDPOINT;
    const url = new URL(endpoint);
    if (!url.searchParams.get("apikey")) {
        url.searchParams.set("apikey", getApiKey());
    }
    return url.toString();
}

function extractGiftedJoke(payload) {
    const root = payload?.result || payload || {};
    const setup = String(root?.setup || "").trim();
    const punchline = String(root?.punchline || "").trim();
    return { setup, punchline };
}

module.exports = {
    name: "joke",
    react: "\u{1F923}",
    category: "fun",
    description: "Get a random joke",
    usage: ",joke",
    aliases: ["funny", "randomjoke", "jokes"],

    execute: async (_sock, m) => {
        try {
            let setup = "";
            let punchline = "";

            try {
                const giftedUrl = buildGiftedUrl();
                const { data } = await axios.get(giftedUrl, { timeout: 15000 });
                const extracted = extractGiftedJoke(data);
                setup = extracted.setup;
                punchline = extracted.punchline;
            } catch (giftedError) {
                console.error("joke gifted api error:", giftedError?.response?.data || giftedError?.message || giftedError);
            }

            if (!setup || !punchline) {
                const fallbackUrl = "https://official-joke-api.appspot.com/random_joke";
                const { data } = await axios.get(fallbackUrl, { timeout: 12000 });
                setup = String(data?.setup || "").trim();
                punchline = String(data?.punchline || "").trim();
            }

            if (!setup || !punchline) {
                await m.reply("Couldn't fetch a joke right now. Please try again later.");
                return;
            }

            const message = `\u{1F602} *Here's a random joke for you!* \u{1F602}\n\n*${setup}*\n\n${punchline} \u{1F604}`;
            await m.reply(message);
        } catch (error) {
            console.error("joke error:", error?.message || error);
            await m.reply("Couldn't fetch a joke right now. Please try again later.");
        }
    }
};
