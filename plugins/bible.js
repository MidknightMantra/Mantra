const DEFAULT_ENDPOINT = "https://api.giftedtech.co.ke/api/tools/bible";
const DEFAULT_GIFTED_KEY = "gifted";

function getApiKey() {
    return String(process.env.AI_API_KEY || process.env.GIFTED_API_KEY || "").trim() || DEFAULT_GIFTED_KEY;
}

function getEndpoint() {
    return String(process.env.GIFTED_BIBLE_ENDPOINT || "").trim() || DEFAULT_ENDPOINT;
}

function normalizeText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
}

function parseArgs(args) {
    const raw = String((args || []).join(" ") || "").trim();
    if (!raw) return { verse: "", lang: "" };

    const tokens = raw.split(/\s+/);
    const last = tokens[tokens.length - 1].toLowerCase();
    if (last === "sw" || last === "swahili") {
        tokens.pop();
        return { verse: tokens.join(" ").trim(), lang: "swahili" };
    }
    if (last === "hi" || last === "hindi") {
        tokens.pop();
        return { verse: tokens.join(" ").trim(), lang: "hindi" };
    }

    return { verse: raw, lang: "" };
}

function getVerseText(result, lang) {
    if (!result) return "";

    if (lang && typeof result?.translations?.[lang] === "string") {
        return normalizeText(result.translations[lang]);
    }

    if (typeof result?.data === "string") {
        return normalizeText(result.data);
    }

    return "";
}

module.exports = {
    name: "bible",
    react: "📖",
    category: "other",
    description: "Fetch Bible verse by reference",
    usage: ",bible <verse> [sw|hi]",
    aliases: ["verse", "scripture"],

    execute: async (_sock, m) => {
        try {
            const { verse, lang } = parseArgs(m.args);
            if (!verse) {
                await m.reply(
                    `Please provide a verse reference.\nUsage: ${m.prefix}bible John 3:16\n` +
                    `Optional language: ${m.prefix}bible John 3:16 sw`
                );
                return;
            }

            await m.react("⏳");

            const url = new URL(getEndpoint());
            if (!url.searchParams.get("apikey")) {
                url.searchParams.set("apikey", getApiKey());
            }
            url.searchParams.set("verse", verse);

            const response = await fetch(url.toString(), {
                method: "GET",
                headers: { accept: "application/json" }
            });

            const payload = await response.json().catch(() => ({}));
            if (!response.ok || payload?.success === false) {
                const err = payload?.message || payload?.error?.message || response.statusText || "Request failed";
                throw new Error(String(err));
            }

            const result = payload?.result || {};
            const ref = normalizeText(result?.verse || verse);
            const text = getVerseText(result, lang);

            if (!text) {
                throw new Error("No verse text found in API response.");
            }

            const langTag = lang ? ` (${lang})` : "";
            await m.reply(`📖 *${ref}${langTag}*\n\n${text}`);
            await m.react("✅");
        } catch (error) {
            console.error("bible error:", error?.message || error);
            try {
                await m.react("❌");
            } catch {}
            await m.reply(`Failed to fetch verse: ${error?.message || "unknown error"}`);
        }
    }
};
