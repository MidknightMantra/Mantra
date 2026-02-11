const DEFAULT_DARES_ENDPOINT = "https://api.giftedtech.co.ke/api/fun/dares";
const DEFAULT_GIFTED_KEY = "gifted";

const FALLBACK_DARES = [
    "Post your funniest selfie in status right now.",
    "Send a voice note singing your favorite chorus.",
    "Message your best friend and say only emoji for 5 minutes.",
    "Change your WhatsApp bio to something funny for 10 minutes.",
    "Record a 10-second dramatic intro about yourself."
];

function getApiKey() {
    return String(process.env.AI_API_KEY || process.env.GIFTED_API_KEY || "").trim() || DEFAULT_GIFTED_KEY;
}

function getEndpoint() {
    return String(process.env.GIFTED_DARES_ENDPOINT || "").trim() || DEFAULT_DARES_ENDPOINT;
}

function pickFallbackDare() {
    const index = Math.floor(Math.random() * FALLBACK_DARES.length);
    return FALLBACK_DARES[index];
}

function extractDare(payload) {
    if (!payload) return "";
    if (typeof payload.result === "string") return payload.result.trim();
    if (typeof payload.message === "string") return payload.message.trim();
    if (typeof payload.data === "string") return payload.data.trim();
    return "";
}

module.exports = {
    name: "dare",
    react: "😈",
    category: "fun",
    description: "Get a random dare",
    usage: ",dare",
    aliases: ["dares", "truthordare"],

    execute: async (_sock, m) => {
        try {
            let dareText = "";

            try {
                const url = new URL(getEndpoint());
                if (!url.searchParams.get("apikey")) {
                    url.searchParams.set("apikey", getApiKey());
                }

                const response = await fetch(url.toString(), {
                    method: "GET",
                    headers: { accept: "application/json" }
                });

                const payload = await response.json().catch(() => ({}));
                if (response.ok && payload?.success !== false) {
                    dareText = extractDare(payload);
                } else {
                    const apiError = extractDare(payload) || payload?.error?.message || response.statusText;
                    console.error("dare api error:", apiError);
                }
            } catch (apiError) {
                console.error("dare fetch error:", apiError?.message || apiError);
            }

            if (!dareText) {
                dareText = pickFallbackDare();
            }

            await m.reply(`😈 *Dare Challenge*\n\n${dareText}`);
        } catch (error) {
            console.error("dare command error:", error?.message || error);
            await m.reply("Couldn't fetch a dare right now. Try again.");
        }
    }
};
