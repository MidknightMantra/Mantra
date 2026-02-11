const axios = require("axios");

module.exports = {
    name: "fact",
    react: "🤓",
    category: "fun",
    description: "Get a random fun fact",
    usage: ",fact",
    aliases: ["funfact", "randomfact"],

    execute: async (_sock, m) => {
        try {
            const url = "https://uselessfacts.jsph.pl/random.json?language=en";
            const response = await axios.get(url, { timeout: 12000 });
            const fact = String(response?.data?.text || "").trim();

            if (!fact) {
                await m.reply("Could not fetch a fact right now. Please try again.");
                return;
            }

            const funFact = `
🧠 *Random Fun Fact* 🧠

${fact}

> *Mantra* 😄
`;

            await m.reply(funFact.trim());
        } catch (e) {
            console.error("fact error:", e?.message || e);
            await m.reply("An error occurred while fetching a fun fact. Please try again later.");
        }
    }
};
