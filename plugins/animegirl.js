const axios = require("axios");

module.exports = {
    name: "animegirl",
    react: "👧",
    category: "fun",
    description: "Fetch a random anime girl image",
    usage: ",animegirl",
    aliases: ["waifu", "animewaifu"],

    execute: async (sock, m) => {
        try {
            const apiUrl = "https://api.waifu.pics/sfw/waifu";
            const response = await axios.get(apiUrl, { timeout: 12000 });
            const imageUrl = response?.data?.url;

            if (!imageUrl) {
                await m.reply("No anime image found right now. Try again.");
                return;
            }

            await sock.sendMessage(m.from, {
                image: { url: imageUrl },
                caption: "👧 *Random Anime Girl Image* 👧\n> MidknightMantra"
            });
        } catch (e) {
            console.error("animegirl error:", e?.message || e);
            await m.reply(`Error fetching anime girl image: ${e?.message || "Unknown error"}`);
        }
    }
};
