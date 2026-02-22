const axios = require("axios");

module.exports = {
    name: "trt",
    react: "🌐",
    category: "other",
    description: "Translate text between languages",
    usage: ",trt <target lang> <text> OR ,trt <source>|<target> <text>",
    aliases: ["translate", "trans"],

    execute: async (_sock, m) => {
        try {
            const args = m.args || [];
            const botName = process.env.BOT_NAME || "MANTRA";

            if (args.length < 2) {
                await m.reply(
                    `╭─ 🌐 *Translate* ─\n` +
                    `│\n` +
                    `│  Usage:\n` +
                    `│  ${m.prefix}trt <lang> <text>\n` +
                    `│  ${m.prefix}trt en|sw <text>\n` +
                    `│\n` +
                    `│  Auto-detects source language.\n` +
                    `│  Use source|target format to\n` +
                    `│  specify both languages.\n` +
                    `│\n` +
                    `│  Examples:\n` +
                    `│  ${m.prefix}trt sw Hello world\n` +
                    `│  ${m.prefix}trt en|fr Good morning\n` +
                    `│\n` +
                    `╰──────────────\n\n` +
                    `> *${botName}*`
                );
                return;
            }

            const langArg = String(args[0]).trim().toLowerCase();
            const textToTranslate = args.slice(1).join(" ").trim();

            let sourceLang = "auto";
            let targetLang = langArg;

            if (langArg.includes("|")) {
                const parts = langArg.split("|");
                sourceLang = parts[0].trim() || "auto";
                targetLang = parts[1].trim();
            }

            if (!targetLang || !/^[a-z]{2,5}$/i.test(targetLang)) {
                await m.reply("Invalid language code. Examples: en, sw, fr, es, hi, ar, zh");
                return;
            }

            if (!textToTranslate) {
                await m.reply(`Provide text to translate.\nUsage: ${m.prefix}trt <lang> <text>`);
                return;
            }

            const langpair = sourceLang === "auto"
                ? `autodetect|${targetLang}`
                : `${sourceLang}|${targetLang}`;

            const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(textToTranslate)}&langpair=${langpair}`;
            const response = await axios.get(url, { timeout: 12000 });
            const translation = response?.data?.responseData?.translatedText;
            const detectedLang = response?.data?.responseData?.detectedLanguage;

            if (!translation) {
                await m.reply("Translation service returned no result. Try again.");
                return;
            }

            const sourceLabel = detectedLang ? detectedLang.toUpperCase() : (sourceLang === "auto" ? "Auto" : sourceLang.toUpperCase());

            const text = [
                `╭─ 🌐 *Translation* ─`,
                `│`,
                `│  *Original* _(${sourceLabel})_:`,
                `│  ${textToTranslate}`,
                `│`,
                `│  *Translated* _(${targetLang.toUpperCase()})_:`,
                `│  ${translation}`,
                `│`,
                `╰──────────────`,
                ``,
                `> *${botName}*`
            ].join("\n");

            await m.reply(text);
        } catch (e) {
            console.error("translate error:", e?.response?.data || e?.message || e);
            await m.reply("Translation failed. Please try again later.");
        }
    }
};
