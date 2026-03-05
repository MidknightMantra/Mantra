const axios = require('axios');

module.exports = {
    name: "anime",
    react: "⛩️",
    category: "search",
    description: "Search for anime information on MyAnimeList",
    usage: ",anime <title>",
    aliases: ["mal", "animesearch"],

    execute: async (_sock, m) => {
        try {
            const query = String(m.args?.join(" ") || "").trim();
            if (!query) {
                await m.reply(`Please provide an anime title.\nUsage: ${m.prefix}anime <title>`);
                return;
            }

            const url = `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=1`;
            const response = await axios.get(url, {
                timeout: 10000,
                headers: { "User-Agent": "Mantra-Bot" }
            });

            const dataList = response.data?.data;
            if (!dataList || dataList.length === 0) {
                await m.reply("Anime not found. Try a different title.");
                return;
            }

            const anime = dataList[0];
            const title = anime.title || 'Unknown';
            const englishTitle = anime.title_english ? `(${anime.title_english})` : '';
            const status = anime.status || 'Unknown';
            const episodes = anime.episodes || '?';
            const score = anime.score ? `${anime.score}/10` : 'N/A';
            const rating = anime.rating || 'N/A';
            const year = anime.year || 'Unknown';
            const synopsis = anime.synopsis
                ? anime.synopsis.slice(0, 300) + (anime.synopsis.length > 300 ? '...' : '')
                : 'No synopsis available.';
            const urlLink = anime.url || '';
            const imageUrl = anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url;

            const text = `
⛩️ *Anime Search*

🏷️ *Title:* ${title} ${englishTitle}
⭐ *Score:* ${score}
📺 *Status:* ${status}
🎬 *Episodes:* ${episodes}
🔞 *Rating:* ${rating}
📅 *Year:* ${year}

📜 *Synopsis:*
${synopsis}

🔗 *Link:* ${urlLink}
> *Mantra Anime Scraper*
`.trim();

            if (imageUrl) {
                await _sock.sendMessage(m.from, {
                    image: { url: imageUrl },
                    caption: text
                });
            } else {
                await m.reply(text);
            }
        } catch (e) {
            console.error("anime error:", e?.message || e);
            await m.reply("An error occurred while fetching anime data.");
        }
    }
};
