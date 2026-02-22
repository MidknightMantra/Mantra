const axios = require("axios");

module.exports = {
    name: "news",
    react: "📰",
    category: "other",
    description: "Get the latest news headlines",
    usage: ",news [country code]",
    aliases: ["headlines"],

    execute: async (sock, m) => {
        try {
            const apiKey = String(process.env.NEWS_API_KEY || "").trim();
            if (!apiKey) {
                await m.reply(
                    "News API key not configured.\n" +
                    "Ask the bot owner to set the *NEWS_API_KEY* environment variable."
                );
                return;
            }

            const country = String(m.args?.[0] || "us").trim().toLowerCase().slice(0, 2);
            const botName = process.env.BOT_NAME || "MANTRA";

            const response = await axios.get("https://newsapi.org/v2/top-headlines", {
                params: { country, apiKey },
                timeout: 20000
            });

            const articles = Array.isArray(response?.data?.articles) ? response.data.articles : [];
            if (!articles.length) {
                await m.reply("No news articles found.");
                return;
            }

            const top = articles.slice(0, 5);
            const lines = [`╭─ 📰 *Top Headlines* (${country.toUpperCase()}) ─`, `│`];

            for (let i = 0; i < top.length; i++) {
                const a = top[i];
                const title = a?.title || "Untitled";
                const desc = a?.description || "";
                const url = a?.url || "";
                lines.push(`│  *${i + 1}. ${title}*`);
                if (desc) lines.push(`│  _${desc.slice(0, 120)}${desc.length > 120 ? "..." : ""}_`);
                if (url) lines.push(`│  🔗 ${url}`);
                lines.push(`│`);
            }

            lines.push(`╰──────────────`);
            lines.push(``);
            lines.push(`> *${botName}*`);

            await m.reply(lines.join("\n"));
        } catch (e) {
            console.error("news error:", e?.response?.data || e?.message || e);
            await m.reply("Could not fetch news. Please try again later.");
        }
    }
};
