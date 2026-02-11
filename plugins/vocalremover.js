const DEFAULT_GIFTED_KEY = "gifted";
const DEFAULT_ENDPOINTS = [
    "https://api.giftedtech.co.ke/api/tools/vocalremover",
    "https://api.giftedtech.co.ke/api/tools/vocalremoverv2"
];

function getApiKey() {
    return String(process.env.AI_API_KEY || process.env.GIFTED_API_KEY || "").trim() || DEFAULT_GIFTED_KEY;
}

function getEndpoints() {
    const custom = String(process.env.GIFTED_VOCALREMOVER_ENDPOINT || "").trim();
    if (!custom) return DEFAULT_ENDPOINTS;
    return custom.split(",").map((value) => value.trim()).filter(Boolean);
}

function isUrl(value) {
    return /^https?:\/\//i.test(String(value || "").trim());
}

function sanitizeFileBase(value) {
    const base = String(value || "audio")
        .replace(/\.[a-z0-9]{1,6}$/i, "")
        .replace(/[\\/:*?"<>|]/g, "_")
        .trim();
    return base || "audio";
}

function extractTracks(payload) {
    const result = payload?.result || {};
    return {
        title: String(result?.title || "audio").trim(),
        original: String(result?.original || "").trim(),
        vocals: String(result?.vocals || "").trim(),
        instrumental: String(result?.instrumental || "").trim()
    };
}

async function queryVocalRemover(sourceUrl) {
    const apiKey = getApiKey();
    const endpoints = getEndpoints();
    const errors = [];

    for (const endpoint of endpoints) {
        try {
            const url = new URL(endpoint);
            if (!url.searchParams.get("apikey")) {
                url.searchParams.set("apikey", apiKey);
            }
            url.searchParams.set("url", sourceUrl);

            const response = await fetch(url.toString(), {
                method: "GET",
                headers: { accept: "application/json" }
            });

            const payload = await response.json().catch(() => ({}));
            if (!response.ok || payload?.success === false) {
                const err = payload?.message || payload?.error?.message || response.statusText || "Request failed";
                throw new Error(String(err));
            }

            const tracks = extractTracks(payload);
            if (!tracks.vocals || !tracks.instrumental) {
                throw new Error("API did not return vocals/instrumental URLs.");
            }

            return tracks;
        } catch (error) {
            errors.push(`${endpoint}: ${error?.message || error}`);
        }
    }

    throw new Error(errors.join(" | "));
}

module.exports = {
    name: "vocalremover",
    react: "\u{1F39A}\uFE0F",
    category: "convert",
    description: "Split song into vocals and instrumental using URL",
    usage: ",vocalremover <audio_url>",
    aliases: ["vr", "stem", "stems", "acapella"],

    execute: async (sock, m) => {
        try {
            const input = String((m.args || []).join(" ") || "").trim();
            if (!input || !isUrl(input)) {
                await m.reply(`Please provide a valid audio URL.\nUsage: ${m.prefix}vocalremover <audio_url>`);
                return;
            }

            await m.react("\u23F3");
            const { title, vocals, instrumental } = await queryVocalRemover(input);
            const fileBase = sanitizeFileBase(title);

            await m.reply(`Processing complete for: ${title}`);

            await sock.sendMessage(m.from, {
                document: { url: vocals },
                mimetype: "audio/mpeg",
                fileName: `${fileBase}-vocals.mp3`,
                caption: "Vocals track"
            });

            await sock.sendMessage(m.from, {
                document: { url: instrumental },
                mimetype: "audio/mpeg",
                fileName: `${fileBase}-instrumental.mp3`,
                caption: "Instrumental track"
            });

            await m.react("\u2705");
        } catch (error) {
            console.error("vocalremover error:", error?.message || error);
            try {
                await m.react("\u274C");
            } catch {}
            await m.reply(`Failed to split audio: ${error?.message || "unknown error"}`);
        }
    }
};
