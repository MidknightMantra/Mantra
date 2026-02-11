const axios = require("axios");

module.exports = {
    name: "define",
    react: "🔍",
    category: "other",
    description: "Get the definition of a word",
    usage: ",define <word>",
    aliases: ["dictionary", "meaning"],

    execute: async (_sock, m) => {
        try {
            const q = String(m.args?.join(" ") || "").trim();
            if (!q) {
                await m.reply(`Please provide a word to define.\nUsage: ${m.prefix}define <word>`);
                return;
            }

            const word = q;
            const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`;
            const response = await axios.get(url, { timeout: 15000 });

            const entry = Array.isArray(response.data) ? response.data[0] : null;
            if (!entry) {
                await m.reply("No definition found for that word.");
                return;
            }

            const firstMeaning = Array.isArray(entry.meanings) ? entry.meanings[0] : null;
            const firstDefinition = Array.isArray(firstMeaning?.definitions)
                ? firstMeaning.definitions[0]
                : null;

            const definition = firstDefinition?.definition || "No definition available";
            const example = firstDefinition?.example || "No example available";
            const synonymsArr = Array.isArray(firstDefinition?.synonyms) ? firstDefinition.synonyms : [];
            const synonyms = synonymsArr.length ? synonymsArr.join(", ") : "No synonyms available";

            const wordInfo = `
📚 *Word*: ${entry.word || word}
🔍 *Definition*: ${definition}
📝 *Example*: ${example}
🔗 *Synonyms*: ${synonyms}

> *Mantra*
`;

            await m.reply(wordInfo.trim());
        } catch (e) {
            console.error("define error:", e?.response?.data || e?.message || e);
            if (e?.response?.status === 404) {
                await m.reply("Word not found. Please check the spelling and try again.");
                return;
            }
            await m.reply("An error occurred while fetching the definition. Please try again later.");
        }
    }
};
