const axios = require("axios");

module.exports = {
    name: "trt",
    react: "🌐",
    category: "other",
    description: "Translate text between languages",
    usage: ",trt <language_code> <text>",
    aliases: ["translate", "trans"],

    execute: async (_sock, m) => {
        try {
            const args = m.args || [];
            if (args.length < 2) {
                await m.reply(`Please provide a language code and text. Usage: ${m.prefix}trt <language code> <text>`);
                return;
            }

            const targetLang = String(args[0]).trim().toLowerCase();
            const textToTranslate = args.slice(1).join(" ").trim();

            if (!/^[a-z]{2,5}$/i.test(targetLang)) {
                await m.reply("Invalid language code. Example: en, sw, fr, es, hi");
                return;
            }

            if (!textToTranslate) {
                await m.reply(`Please provide text to translate. Usage: ${m.prefix}trt <language code> <text>`);
                return;
            }

            const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(textToTranslate)}&langpair=en|${targetLang}`;
            const response = await axios.get(url, { timeout: 12000 });
            const translation = response?.data?.responseData?.translatedText;

            if (!translation) {
                await m.reply("Translation service returned no result. Try again.");
                return;
            }

            const translationMessage = `
Translation

Original: ${textToTranslate}
Translated: ${translation}
Language: ${targetLang.toUpperCase()}
> *Mantra*
`;

            await m.reply(translationMessage.trim());
        } catch (e) {
            console.error("translate error:", e?.response?.data || e?.message || e);
            await m.reply("An error occurred while translating the text. Please try again later.");
        }
    }
};
