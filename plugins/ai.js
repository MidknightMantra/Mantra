const conversationHistory = Object.create(null);
const MAX_HISTORY_LENGTH = 5;
const DEFAULT_ENDPOINT = "https://gurusensei.dev/v1/chat/completions";
const DEFAULT_MODEL = "gpt-4o-mini";
const REQUEST_TIMEOUT_MS = 60000;

function getUserId(sender) {
    return String(sender || "").trim().toLowerCase();
}

function getEndpoint() {
    return String(process.env.AI_CHAT_ENDPOINT || process.env.AI_ENDPOINT || "").trim() || DEFAULT_ENDPOINT;
}

function getModel() {
    return String(process.env.AI_MODEL || "").trim() || DEFAULT_MODEL;
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

function buildMessages(userId, prompt) {
    const messages = [
        {
            role: "system",
            content:
                "You are Mantra, a friendly and helpful assistant made by Midknight Mantra. " +
                "You provide concise, accurate, and helpful responses while maintaining a conversational tone. " +
                "You do not refuse to answer questions unless they involve illegal activities, harm, or explicit content. " +
                "When responding in a WhatsApp chat context, keep your answers relatively concise but complete."
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

function remember(userId, userText, aiText) {
    if (!conversationHistory[userId]) {
        conversationHistory[userId] = [];
    }

    conversationHistory[userId].push({
        user: userText,
        assistant: aiText
    });

    if (conversationHistory[userId].length > MAX_HISTORY_LENGTH) {
        conversationHistory[userId].shift();
    }
}

module.exports = {
    name: "ai",
    react: "??",
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
            await m.reply("? Your conversation history has been reset. We can start fresh now!");
            return;
        }

        if (!text) {
            await m.reply(
                "Please provide a question or message to chat with Mantra AI.\n\n" +
                `Example: *${m.prefix}chat* Hello, how are you today?\n\n` +
                "Commands:\n" +
                `- *${m.prefix}chat* <message> - Chat with conversation memory\n` +
                `- *${m.prefix}resetai* - Reset your conversation history`
            );
            return;
        }

        try {
            if (typeof sock.sendPresenceUpdate === "function") {
                await sock.sendPresenceUpdate("composing", m.from);
            }

            const endpoint = getEndpoint();
            const model = getModel();
            const payload = {
                model,
                messages: buildMessages(userId, text),
                temperature: 0.7,
                max_tokens: 1000
            };

            const response = await fetchWithTimeout(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                const apiError = data?.error?.message || data?.message || response.statusText || "Request failed";
                throw new Error(`API Error: ${apiError}`);
            }

            const aiResponse = String(data?.choices?.[0]?.message?.content || "").trim();
            if (!aiResponse) {
                throw new Error("Invalid response from AI service");
            }

            remember(userId, text, aiResponse);
            const formatted = `+--? *MANTRA AI* ?--+\n\n${aiResponse}\n\n+---------------+`;
            await m.reply(formatted);
            await m.react("?");
        } catch (error) {
            console.error("AI Chat Error:", error?.message || error);
            try {
                await m.react("?");
            } catch {}
            await m.reply(`? Error: ${error?.message || "Unknown error"}`);
        }
    }
};
