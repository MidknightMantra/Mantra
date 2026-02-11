const DEFAULT_TRANSCRIPT_ENDPOINT = "https://api.giftedtech.co.ke/api/ai/transcript";
const DEFAULT_GIFTED_KEY = "gifted";
const MAX_CHUNK = 3500;

function getApiKey() {
    return String(process.env.AI_API_KEY || process.env.GIFTED_API_KEY || "").trim() || DEFAULT_GIFTED_KEY;
}

function getEndpoint() {
    return String(process.env.GIFTED_TRANSCRIPT_ENDPOINT || "").trim() || DEFAULT_TRANSCRIPT_ENDPOINT;
}

function looksLikeUrl(value) {
    return /^https?:\/\//i.test(String(value || "").trim());
}

function isYouTubeUrl(value) {
    return /(?:youtube\.com|youtu\.be)/i.test(String(value || ""));
}

function chunkText(text, size = MAX_CHUNK) {
    const clean = String(text || "");
    const chunks = [];
    for (let i = 0; i < clean.length; i += size) {
        chunks.push(clean.slice(i, i + size));
    }
    return chunks;
}

function extractTranscript(payload) {
    if (!payload) return "";
    if (typeof payload.result === "string") return payload.result.trim();
    if (typeof payload.data === "string") return payload.data.trim();
    if (typeof payload.message === "string") return payload.message.trim();
    return "";
}

module.exports = {
    name: "transcript",
    react: "📝",
    category: "other",
    description: "Fetch transcript from a YouTube link",
    usage: ",transcript <youtube_url>",
    aliases: ["yttranscript", "script", "subtitles"],

    execute: async (_sock, m) => {
        try {
            const input = String((m.args || []).join(" ") || "").trim();
            if (!input) {
                await m.reply(`Please provide a YouTube URL.\nUsage: ${m.prefix}transcript <url>`);
                return;
            }

            if (!looksLikeUrl(input) || !isYouTubeUrl(input)) {
                await m.reply("Invalid link. Please send a valid YouTube URL.");
                return;
            }

            await m.react("⏳");

            const url = new URL(getEndpoint());
            url.searchParams.set("apikey", getApiKey());
            url.searchParams.set("url", input);

            const response = await fetch(url.toString(), {
                method: "GET",
                headers: { accept: "application/json" }
            });

            const payload = await response.json().catch(() => ({}));
            if (!response.ok || payload?.success === false) {
                const msg = payload?.result || payload?.message || response.statusText || "Request failed";
                throw new Error(String(msg));
            }

            const transcript = extractTranscript(payload);
            if (!transcript) {
                throw new Error("No transcript found in API response.");
            }

            const chunks = chunkText(transcript);
            for (let i = 0; i < chunks.length; i += 1) {
                const prefix = chunks.length > 1 ? `Transcript (${i + 1}/${chunks.length})\n\n` : "Transcript\n\n";
                await m.reply(`${prefix}${chunks[i]}`);
            }

            await m.react("✅");
        } catch (error) {
            console.error("transcript error:", error?.message || error);
            try {
                await m.react("❌");
            } catch {}
            await m.reply(`Failed to fetch transcript: ${error?.message || "unknown error"}`);
        }
    }
};
