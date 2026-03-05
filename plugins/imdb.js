const axios = require('axios');

module.exports = {
    name: "imdb",
    react: "🎬",
    category: "search",
    description: "Search for movie or TV show information",
    usage: ",imdb <title>",
    aliases: ["movie", "tvshow"],

    execute: async (_sock, m) => {
        try {
            const query = String(m.args?.join(" ") || "").trim();
            if (!query) {
                await m.reply(`Please provide a movie or TV show title.\nUsage: ${m.prefix}imdb <title>`);
                return;
            }

            const url = `https://api.popcat.xyz/imdb?q=${encodeURIComponent(query)}`;
            const response = await axios.get(url, {
                timeout: 10000,
                headers: { "User-Agent": "Mantra-Bot" }
            });

            const data = response.data;
            if (!data || data.error) {
                await m.reply("Movie or TV show not found.");
                return;
            }

            const text = `
🎬 *IMDb Search*

🏷️ *Title:* ${data.title || 'N/A'}
📅 *Year:* ${data.year || 'N/A'}
⏱️ *Runtime:* ${data.runtime || 'N/A'}
⭐ *Rating:* ${data.rating || 'N/A'}/10 (${data.votes || '0'} votes)
🎭 *Genres:* ${data.genres || 'N/A'}
🎬 *Director:* ${data.director || 'N/A'}
👥 *Actors:* ${data.actors || 'N/A'}
🌍 *Country:* ${data.country || 'N/A'}

📝 *Plot:* ${data.plot || 'N/A'}

> *Mantra Movie Scraper*
`.trim();

            if (data.poster && data.poster !== "N/A") {
                await _sock.sendMessage(m.from, {
                    image: { url: data.poster },
                    caption: text
                });
            } else {
                await m.reply(text);
            }
        } catch (e) {
            console.error("imdb error:", e?.message || e);
            await m.reply("An error occurred while fetching IMDb data.");
        }
    }
};
