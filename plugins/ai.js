const conversationHistory = Object.create(null);
const MAX_HISTORY_LENGTH = 5;
const DEFAULT_MODEL = "gpt-4o-mini";
const REQUEST_TIMEOUT_MS = 60000;
const DEFAULT_GIFTED_ENDPOINTS = [
    "https://api.giftedtech.co.ke/api/ai/gpt4o-mini",
    "https://api.giftedtech.co.ke/api/ai/letmegpt",
    "https://api.giftedtech.co.ke/api/ai/gpt4o",
    "https://api.giftedtech.co.ke/api/ai/ai"
];
const DEFAULT_GIFTED_KEY = "gifted";

function getUserId(sender) {
    return String(sender || "").trim().toLowerCase();
}

function getModel() {
    return String(process.env.AI_MODEL || "").trim() || DEFAULT_MODEL;
}

function getCustomEndpoints() {
    const raw = String(process.env.AI_CHAT_ENDPOINT || process.env.AI_ENDPOINT || "").trim();
    if (!raw) return [];
    return raw.split(",").map((value) => value.trim()).filter(Boolean);
}

function getApiKey() {
    return String(process.env.AI_API_KEY || process.env.GIFTED_API_KEY || "").trim() || DEFAULT_GIFTED_KEY;
}

async function fetchWithTimeout(url, init = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, { ...init, signal: controller.signal });
    } finally {
        clearTimeout(timer);
    }
}

function extractTextFromPayload(payload) {
    if (!payload) return "";

    if (typeof payload === "string") {
        return payload.trim();
    }

    const candidates = [
        payload.result,
        payload.response,
        payload.message,
        payload.reply,
        payload.data,
        payload?.data?.result,
        payload?.data?.response,
        payload?.data?.message,
        payload?.choices?.[0]?.message?.content,
        payload?.output_text
    ];

    for (const candidate of candidates) {
        if (typeof candidate === "string" && candidate.trim()) {
            return candidate.trim();
        }
    }

    return "";
}

function buildMessages(userId, prompt) {
    const messages = [
        {
            role: "system",
            content:
                "You are Mantra, a friendly and helpful assistant made by Midknight Mantra. " +
                "You provide concise, accurate, and helpful responses while maintaining a conversational tone. " +
                "When responding in a WhatsApp chat context, keep answers concise but complete."
        }
    ];

    const history = Array.isArray(conversationHistory[userId]) ? conversationHistory[userId] : [];
    for (const exchange of history) {
        if (exchange?.user) messages.push({ role: "user", content: exchange.user });
        if (exchange?.assistant) messages.push({ role: "assistant", content: exchange.assistant });
    }

    messages.push({ role: "user", content: prompt });
    return messages;
}

function buildPrompt(messages) {
    const trimmed = messages.slice(-8);
    return trimmed
        .map((entry) => `${String(entry.role || "user").toUpperCase()}: ${String(entry.content || "").trim()}`)
        .filter(Boolean)
        .join("\n\n");
}

function remember(userId, userText, aiText) {
    if (!conversationHistory[userId]) {
        conversationHistory[userId] = [];
    }

    conversationHistory[userId].push({ user: userText, assistant: aiText });

    if (conversationHistory[userId].length > MAX_HISTORY_LENGTH) {
        conversationHistory[userId].shift();
    }
}

async function queryGifted(messages) {
    const customRaw = String(process.env.GIFTED_AI_ENDPOINT || "").trim();
    const endpoints = customRaw
        ? customRaw.split(",").map((value) => value.trim()).filter(Boolean)
        : DEFAULT_GIFTED_ENDPOINTS;
    const apiKey = getApiKey();
    const prompt = buildPrompt(messages);
    const errors = [];

    for (const endpoint of endpoints) {
        try {
            const url = new URL(endpoint);
            if (!url.searchParams.get("apikey")) {
                url.searchParams.set("apikey", apiKey);
            }
            url.searchParams.set("q", prompt);

            const response = await fetchWithTimeout(url.toString(), {
                method: "GET",
                headers: { accept: "application/json" }
            });

            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                const apiError = extractTextFromPayload(data) || response.statusText || "Request failed";
                throw new Error(apiError);
            }

            const text = extractTextFromPayload(data);
            if (!text) {
                throw new Error("empty response");
            }

            return text;
        } catch (error) {
            errors.push(`${endpoint}: ${error.message}`);
        }
    }

    throw new Error(`Gifted API Error: ${errors.join(" | ")}`);
}

async function queryCustomEndpoint(endpoint, model, messages) {
    const prompt = buildPrompt(messages);

    const asGetUrl = new URL(endpoint);
    if (!asGetUrl.searchParams.get("q")) {
        asGetUrl.searchParams.set("q", prompt);
    }
    if (!asGetUrl.searchParams.get("apikey") && process.env.AI_API_KEY) {
        asGetUrl.searchParams.set("apikey", String(process.env.AI_API_KEY));
    }

    try {
        const getRes = await fetchWithTimeout(asGetUrl.toString(), {
            method: "GET",
            headers: { accept: "application/json" }
        }, 30000);
        const getData = await getRes.json().catch(() => ({}));
        if (getRes.ok) {
            const text = extractTextFromPayload(getData);
            if (text) return text;
        }
    } catch {}

    const payload = {
        model,
        messages,
        temperature: 0.7,
        max_tokens: 1000
    };

    const postRes = await fetchWithTimeout(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    }, 30000);

    const postData = await postRes.json().catch(() => ({}));
    if (!postRes.ok) {
        const apiError = extractTextFromPayload(postData) || postRes.statusText || "Request failed";
        throw new Error(`Custom API Error: ${apiError}`);
    }

    const text = extractTextFromPayload(postData);
    if (!text) {
        throw new Error("Custom API returned empty response");
    }

    return text;
}

async function queryOpenAI(model, messages) {
    const apiKey = String(process.env.OPENAI_API_KEY || "").trim();
    if (!apiKey) {
        throw new Error("OPENAI_API_KEY is not set");
    }

    const response = await fetchWithTimeout("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({ model, messages, temperature: 0.7, max_tokens: 1000 })
    }, 45000);

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        const apiError = extractTextFromPayload(data) || response.statusText || "Request failed";
        throw new Error(`OpenAI Error: ${apiError}`);
    }

    const text = extractTextFromPayload(data);
    if (!text) {
        throw new Error("OpenAI returned empty response");
    }

    return text;
}

async function queryPollinations(messages) {
    const prompt = buildPrompt(messages);
    const url = `https://text.pollinations.ai/${encodeURIComponent(prompt)}`;

    const response = await fetchWithTimeout(url, {
        method: "GET",
        headers: { accept: "text/plain" }
    }, 45000);

    const text = String(await response.text()).trim();
    if (!response.ok) {
        throw new Error(`Pollinations Error: ${response.status} ${text || response.statusText}`);
    }
    if (!text) {
        throw new Error("Pollinations returned empty response");
    }

    return text;
}

async function queryWithFallbacks(model, messages) {
    const errors = [];

    try {
        return await queryGifted(messages);
    } catch (error) {
        errors.push(`gifted: ${error.message}`);
    }

    for (const endpoint of getCustomEndpoints()) {
        try {
            return await queryCustomEndpoint(endpoint, model, messages);
        } catch (error) {
            errors.push(`custom(${endpoint}): ${error.message}`);
        }
    }

    try {
        return await queryOpenAI(model, messages);
    } catch (error) {
        errors.push(`openai: ${error.message}`);
    }

    try {
        return await queryPollinations(messages);
    } catch (error) {
        errors.push(`pollinations: ${error.message}`);
    }

    throw new Error(errors.join(" | "));
}

module.exports = {
    name: "ai",
    react: "\u{1F9E0}",
    category: "other",
    description: "Chat with AI with short memory",
    usage: ",ai <message>",
    aliases: ["chat", "ask", "gpt", "resetai"],

    execute: async (sock, m) => {
        const command = String(m.command || "").toLowerCase();
        const userId = getUserId(m.sender);
        const text = String((m.args || []).join(" ") || "").trim();

        if (command === "resetai") {
            delete conversationHistory[userId];
            await m.reply("\u2705 Your conversation history has been reset.");
            return;
        }

        if (!text) {
            await m.reply(
                "Please provide a prompt.\n\n" +
                `Example: *${m.prefix}ai* hello\n` +
                `Reset memory: *${m.prefix}resetai*`
            );
            return;
        }

        try {
            if (typeof sock.sendPresenceUpdate === "function") {
                await sock.sendPresenceUpdate("composing", m.from);
            }

            const model = getModel();
            const messages = buildMessages(userId, text);
            const aiResponse = await queryWithFallbacks(model, messages);

            remember(userId, text, aiResponse);
            await m.reply(`${aiResponse}\n\n> *Mantra*`);
            await m.react("\u2705");
        } catch (error) {
            console.error("AI Chat Error:", error?.message || error);
            try {
                await m.react("\u274C");
            } catch {}
            await m.reply("\u274E AI is currently unavailable. Set AI endpoint/API key and try again.");
        }
    }
};
