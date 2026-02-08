import { gmd } from "../lib/gift.js";
import axios from "axios";

/**
 * 🤖 AI QUERY HELPER
 */
async function queryAI(endpoint, query, conText) {
    const { reply, react, GiftedTechApi, GiftedApiKey } = conText;

    if (!query) {
        await react?.("❓");
        return reply("Please provide a question or prompt.");
    }

    try {
        await react?.("🧠");
        const apiUrl = `${GiftedTechApi}/api/ai/${endpoint}?apikey=${GiftedApiKey}&q=${encodeURIComponent(query)}`;
        const res = await axios.get(apiUrl, { timeout: 100000 });

        if (!res.data?.success || !res.data?.result) {
            await react?.("❌");
            return reply("Failed to get a response. Try again.");
        }

        await react?.("✅");
        reply(res.data.result);
    } catch (err) {
        console.error(`AI ${endpoint} error:`, err.message);
        await react?.("❌");
        reply("Error: " + err.message);
    }
}

/**
 * 🚀 AI COMMANDS
 */

gmd({
    pattern: "giftedai",
    aliases: ["ai", "bot"],
    description: "Chat with Gifted AI assistant",
    category: "ai",
}, async (from, Gifted, conText) => {
    await queryAI("ai", conText.q || "Who are you?", conText);
});

gmd({
    pattern: "chatai",
    description: "General AI chat assistant",
    category: "ai",
}, async (from, Gifted, conText) => {
    await queryAI("chat", conText.q, conText);
});

gmd({
    pattern: "gpt",
    aliases: ["chatgpt", "gpt3"],
    description: "Chat with GPT model",
    category: "ai",
}, async (from, Gifted, conText) => {
    await queryAI("gpt", conText.q, conText);
});

gmd({
    pattern: "gpt4",
    aliases: ["chatgpt4"],
    description: "Chat with GPT-4 model",
    category: "ai",
}, async (from, Gifted, conText) => {
    await queryAI("gpt4", conText.q, conText);
});

gmd({
    pattern: "gpt4o",
    aliases: ["chatgpt4o"],
    description: "Chat with GPT-4o model",
    category: "ai",
}, async (from, Gifted, conText) => {
    await queryAI("gpt4o", conText.q, conText);
});

gmd({
    pattern: "gpt4o-mini",
    aliases: ["chatgpt4o-mini", "mini"],
    description: "Chat with GPT-4o Mini (faster)",
    category: "ai",
}, async (from, Gifted, conText) => {
    await queryAI("gpt4o-mini", conText.q, conText);
});

gmd({
    pattern: "openai",
    description: "Chat with OpenAI model",
    category: "ai",
}, async (from, Gifted, conText) => {
    await queryAI("openai", conText.q, conText);
});

gmd({
    pattern: "gemini",
    description: "Chat with Google Gemini",
    category: "ai",
}, async (from, Gifted, conText) => {
    await queryAI("geminiai", conText.q, conText);
});

gmd({
    pattern: "geminipro",
    description: "Chat with Google Gemini Pro",
    category: "ai",
}, async (from, Gifted, conText) => {
    await queryAI("geminiaipro", conText.q, conText);
});

gmd({
    pattern: "deepseek",
    description: "Chat with DeepSeek R1 reasoning model",
    category: "ai",
}, async (from, Gifted, conText) => {
    await queryAI("deepseek-r1", conText.q, conText);
});

gmd({
    pattern: "deepseekv3",
    description: "Chat with DeepSeek V3 model",
    category: "ai",
}, async (from, Gifted, conText) => {
    await queryAI("deepseek-v3", conText.q, conText);
});

gmd({
    pattern: "blackbox",
    aliases: ["blackboxai", "code"],
    description: "Chat with Blackbox AI (coding focused)",
    category: "ai",
}, async (from, Gifted, conText) => {
    await queryAI("blackbox", conText.q, conText);
});

gmd({
    pattern: "mistral",
    aliases: ["mistralai"],
    description: "Chat with Mistral AI model",
    category: "ai",
}, async (from, Gifted, conText) => {
    await queryAI("mistral", conText.q, conText);
});

gmd({
    pattern: "letmegpt",
    description: "Simple GPT-style AI chat",
    category: "ai",
}, async (from, Gifted, conText) => {
    await queryAI("letmegpt", conText.q, conText);
});
