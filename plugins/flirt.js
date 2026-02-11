const DEFAULT_FLIRT_ENDPOINT = "https://api.giftedtech.co.ke/api/fun/flirt";
const DEFAULT_GIFTED_KEY = "gifted";

const FALLBACK_FLIRTS = [
    "If beauty had a name, it would be yours.",
    "Are you a magician? Because whenever I see you, everyone else disappears.",
    "You must be a keyboard, because you are just my type.",
    "Your smile is my favorite notification.",
    "I was having a normal day, then I thought of you."
];

function getApiKey() {
    return String(process.env.AI_API_KEY || process.env.GIFTED_API_KEY || "").trim() || DEFAULT_GIFTED_KEY;
}

function getEndpoint() {
    return String(process.env.GIFTED_FLIRT_ENDPOINT || "").trim() || DEFAULT_FLIRT_ENDPOINT;
}

function pickFallbackFlirt() {
    const index = Math.floor(Math.random() * FALLBACK_FLIRTS.length);
    return FALLBACK_FLIRTS[index];
}

function extractFlirt(payload) {
    if (!payload) return "";
    if (typeof payload.result === "string") return payload.result.trim();
    if (typeof payload.message === "string") return payload.message.trim();
    if (typeof payload.data === "string") return payload.data.trim();
    return "";
}

module.exports = {
    name: "flirt",
    react: "😘",
    category: "fun",
    description: "Get a random flirt line",
    usage: ",flirt",
    aliases: ["pickup", "pickupline"],

    execute: async (_sock, m) => {
        try {
            let flirtText = "";

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
                    flirtText = extractFlirt(payload);
                } else {
                    const apiError = extractFlirt(payload) || payload?.error?.message || response.statusText;
                    console.error("flirt api error:", apiError);
                }
            } catch (apiError) {
                console.error("flirt fetch error:", apiError?.message || apiError);
            }

            if (!flirtText) {
                flirtText = pickFallbackFlirt();
            }

            await m.reply(`😘 *Flirt Line*\n\n${flirtText}`);
        } catch (error) {
            console.error("flirt command error:", error?.message || error);
            await m.reply("Couldn't fetch a flirt line right now. Try again.");
        }
    }
};
