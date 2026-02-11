const axios = require("axios");

module.exports = {
    name: "joke",
    react: "🤣",
    category: "fun",
    description: "Get a random joke",
    usage: ",joke",
    aliases: ["funny", "randomjoke"],

    execute: async (_sock, m) => {
        try {
            const url = "https://official-joke-api.appspot.com/random_joke";
            const response = await axios.get(url, { timeout: 12000 });
            const joke = response?.data || {};

            if (!joke.setup || !joke.punchline) {
                await m.reply("Couldn't fetch a joke right now. Please try again later.");
                return;
            }

            const github = process.env.BOT_GITHUB || "https://github.com/MidknightMantra/Mantra";
            const botName = process.env.BOT_NAME || "MANTRA";

            const jokeMessage = `
😂 *Here's a random joke for you!* 😂

*${joke.setup}*

${joke.punchline} 😄

*© ${botName}*
`;

            await m.reply(jokeMessage.trim());
        } catch (e) {
            console.error("joke error:", e?.message || e);
            await m.reply("Couldn't fetch a joke right now. Please try again later.");
        }
    }
};
