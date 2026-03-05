const google = require('googlethis');

module.exports = {
    name: "google",
    react: "🔍",
    category: "search",
    description: "Search Google and return top results",
    usage: ",google <query>",
    aliases: ["gsearch", "search"],

    execute: async (_sock, m) => {
        try {
            const query = String(m.args?.join(" ") || "").trim();
            if (!query) {
                await m.reply(`Please provide a search term.\nUsage: ${m.prefix}google <query>`);
                return;
            }

            const options = {
                page: 0,
                safe: false,
                parse_ads: false,
                additional_params: {
                    hl: 'en'
                }
            };

            const response = await google.search(query, options);

            if (!response || !response.results || response.results.length === 0) {
                await m.reply("No results found for your query.");
                return;
            }

            // Get top 3 results
            const topResults = response.results.slice(0, 3);
            let text = `🔍 *Google Search Results*\n*Query:* ${query}\n\n`;

            if (response.dictionary) {
                text += `📖 *Definition:* ${response.dictionary.word}\n${response.dictionary.phonetic || ''}\n${response.dictionary.meaning}\n\n`;
            } else if (response.knowledge_panel && response.knowledge_panel.title) {
                text += `📚 *Knowledge Panel:* ${response.knowledge_panel.title}\n${response.knowledge_panel.description}\n\n`;
            }

            topResults.forEach((res, index) => {
                text += `*${index + 1}. ${res.title}*\n📝 ${res.description}\n🔗 ${res.url}\n\n`;
            });

            text += `> *Mantra Google Scraper*`;

            await m.reply(text.trim());
        } catch (e) {
            console.error("google error:", e?.message || e);
            await m.reply("An error occurred while fetching search results.");
        }
    }
};
