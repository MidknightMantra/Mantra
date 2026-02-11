const DEFAULT_GIFTED_KEY = "gifted";
const DEFAULT_DEEPIMG_ENDPOINTS = [
    "https://api.giftedtech.co.ke/api/ai/deepimg",
    "https://api.giftedtech.co.ke/api/ai/magicstudio"
];

function getApiKey() {
    return String(process.env.AI_API_KEY || process.env.GIFTED_API_KEY || "").trim() || DEFAULT_GIFTED_KEY;
}

function getEndpoints() {
    const custom = String(process.env.GIFTED_DEEPIMG_ENDPOINT || "").trim();
    if (!custom) return DEFAULT_DEEPIMG_ENDPOINTS;
    return custom
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
}

function extractImageUrl(payload) {
    if (!payload) return "";
    if (typeof payload.result === "string") return payload.result.trim();
    if (typeof payload.url === "string") return payload.url.trim();
    if (typeof payload.image === "string") return payload.image.trim();
    if (typeof payload.data === "string") return payload.data.trim();
    if (typeof payload?.result?.imageUrl === "string") return payload.result.imageUrl.trim();
    if (typeof payload?.result?.url === "string") return payload.result.url.trim();
    if (typeof payload?.result?.image === "string") return payload.result.image.trim();
    if (typeof payload?.data?.imageUrl === "string") return payload.data.imageUrl.trim();
    return "";
}

async function queryGiftedImage(prompt) {
    const endpoints = getEndpoints();
    const apiKey = getApiKey();
    const errors = [];

    for (const endpoint of endpoints) {
        try {
            const url = new URL(endpoint);
            if (!url.searchParams.get("apikey")) {
                url.searchParams.set("apikey", apiKey);
            }
            url.searchParams.set("prompt", prompt);

            const response = await fetch(url.toString(), {
                method: "GET",
                headers: { accept: "application/json" }
            });

            const payload = await response.json().catch(() => ({}));
            if (!response.ok || payload?.success === false) {
                const errorText = payload?.message || payload?.result || response.statusText || "Request failed";
                throw new Error(String(errorText));
            }

            const imageUrl = extractImageUrl(payload);
            if (!imageUrl || !/^https?:\/\//i.test(imageUrl)) {
                throw new Error("No valid image URL found in response");
            }

            return imageUrl;
        } catch (error) {
            errors.push(`${endpoint}: ${error?.message || error}`);
        }
    }

    throw new Error(errors.join(" | "));
}

module.exports = {
    name: "deepimg",
    react: "\u{1F5BC}\uFE0F",
    category: "other",
    description: "Generate an AI image from prompt text",
    usage: ",deepimg <prompt>",
    aliases: ["imagine", "aiimage", "imgai"],

    execute: async (sock, m) => {
        try {
            const prompt = String((m.args || []).join(" ") || "").trim();
            if (!prompt) {
                await m.reply(`Please provide an image prompt.\nUsage: ${m.prefix}deepimg <prompt>`);
                return;
            }

            await m.react("\u23F3");
            const imageUrl = await queryGiftedImage(prompt);

            await sock.sendMessage(m.from, {
                image: { url: imageUrl },
                caption: `Prompt: ${prompt}`
            });

            await m.react("\u2705");
        } catch (error) {
            console.error("deepimg error:", error?.message || error);
            try {
                await m.react("\u274C");
            } catch {}
            await m.reply(`Failed to generate image: ${error?.message || "unknown error"}`);
        }
    }
};
