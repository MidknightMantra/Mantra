const DEFAULT_ENDPOINT = "https://api.giftedtech.co.ke/api/ai/muslimai";
const DEFAULT_KEY = "gifted";

function getApiKey() {
    return String(process.env.AI_API_KEY || process.env.GIFTED_API_KEY || "").trim() || DEFAULT_KEY;
}

function getEndpoint() {
    return String(process.env.GIFTED_MUSLIMAI_ENDPOINT || "").trim() || DEFAULT_ENDPOINT;
}

function extractAnswer(payload) {
    if (!payload) return "";

    const result = payload.result;
    if (typeof result === "string" && result.trim()) {
        return result.trim();
    }

    if (result && typeof result === "object") {
        if (typeof result.answer === "string" && result.answer.trim()) {
            return result.answer.trim();
        }
        if (typeof result.text === "string" && result.text.trim()) {
            return result.text.trim();
        }
    }

    if (typeof payload.message === "string" && payload.message.trim()) {
        return payload.message.trim();
    }

    return "";
}

module.exports = {
    name: "muslimai",
    react: "🕌",
    category: "other",
    description: "Ask Islamic questions with Muslim AI",
    usage: ",muslimai <question>",
    aliases: ["islamai", "deenai"],

    execute: async (_sock, m) => {
        try {
            const question = String((m.args || []).join(" ") || "").trim();
            if (!question) {
                await m.reply(`Please provide a question.\nUsage: ${m.prefix}muslimai <question>`);
                return;
            }

            await m.react("⏳");

            const url = new URL(getEndpoint());
            url.searchParams.set("apikey", getApiKey());
            url.searchParams.set("q", question);

            const response = await fetch(url.toString(), {
                method: "GET",
                headers: { accept: "application/json" }
            });

            const payload = await response.json().catch(() => ({}));
            if (!response.ok || payload?.success === false) {
                const errorText =
                    extractAnswer(payload) ||
                    payload?.error?.message ||
                    payload?.message ||
                    response.statusText ||
                    "Request failed";
                throw new Error(String(errorText));
            }

            const answer = extractAnswer(payload);
            if (!answer) {
                throw new Error("No answer found in API response.");
            }

            await m.reply(answer);
            await m.react("✅");
        } catch (error) {
            console.error("muslimai error:", error?.message || error);
            try {
                await m.react("❌");
            } catch {}
            await m.reply(`Failed to get response: ${error?.message || "unknown error"}`);
        }
    }
};
