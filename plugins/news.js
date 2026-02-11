const axios = require("axios");

module.exports = {
    name: "news",
    react: "📰",
    category: "other",
    description: "Get the latest news headlines",
    usage: ",news",
    aliases: ["headlines"],

    execute: async (sock, m) => {
        try {
            const apiKey = String(process.env.NEWS_API_KEY || "0f2c43ab11324578a7b1709651736382").trim();
            const response = await axios.get("https://newsapi.org/v2/top-headlines", {
                params: {
                    country: "us",
                    apiKey
                },
                timeout: 20000
            });

            const articles = Array.isArray(response?.data?.articles) ? response.data.articles : [];
            if (!articles.length) {
                await m.reply("No news articles found.");
                return;
            }

            const botName = process.env.BOT_NAME || "MANTRA";
            const github = process.env.BOT_GITHUB || "https://github.com/MidknightMantra/Mantra";

            for (const article of articles.slice(0, 5)) {
                const title = article?.title || "Untitled";
                const description = article?.description || "No description available.";
                const url = article?.url || "";
                const imageUrl = article?.urlToImage || "";

                const message = `
📰 *${title}*
⚠️ _${description}_
${url ? `🔗 _${url}_` : ""}

*© ${botName}*
`;

                if (imageUrl) {
                    await sock.sendMessage(m.from, {
                        image: { url: imageUrl },
                        caption: message.trim()
                    });
                } else {
                    await sock.sendMessage(m.from, { text: message.trim() });
                }
            }
        } catch (e) {
            console.error("news error:", e?.response?.data || e?.message || e);
            await m.reply("Could not fetch news. Please try again later.");
        }
    }
};
