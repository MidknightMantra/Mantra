const axios = require("axios");

const TTS_LANG_MAP = {
    en: "en-US", sw: "sw-KE", fr: "fr-FR", de: "de-DE",
    es: "es-ES", pt: "pt-BR", ar: "ar-XA", hi: "hi-IN",
    zh: "zh-CN", ja: "ja-JP", ko: "ko-KR", it: "it-IT",
    ru: "ru-RU", tr: "tr-TR", nl: "nl-NL", pl: "pl-PL"
};

async function fetchTTS(text, lang) {
    const langCode = TTS_LANG_MAP[lang] || lang || "en-US";

    // Provider 1: Gifted API
    try {
        const url = `https://api.giftedtech.co.ke/api/tools/tts?apikey=gifted&text=${encodeURIComponent(text)}&lang=${encodeURIComponent(langCode)}`;
        const res = await axios.get(url, { responseType: "arraybuffer", timeout: 20000 });
        if (res.data && res.data.byteLength > 100) {
            return Buffer.from(res.data);
        }
    } catch { }

    // Provider 2: Google Translate TTS (unofficial)
    try {
        const googleLang = langCode.split("-")[0];
        const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${encodeURIComponent(googleLang)}&client=tw-ob`;
        const res = await axios.get(url, {
            responseType: "arraybuffer",
            timeout: 15000,
            headers: { "User-Agent": "Mozilla/5.0" }
        });
        if (res.data && res.data.byteLength > 100) {
            return Buffer.from(res.data);
        }
    } catch { }

    throw new Error("All TTS providers failed. Try again later.");
}

module.exports = {
    name: "tts",
    react: "🎙️",
    category: "tools",
    description: "Convert text to voice message (Google TTS)",
    usage: ",tts [lang] <text>",
    aliases: ["voice", "speak", "say", "texttospeech"],

    execute: async (sock, m) => {
        const args = m.args || [];
        if (!args.length) {
            await m.reply(
                `🎙️ *Text to Speech*\n\n` +
                `Usage: ${m.prefix}tts [lang] <text>\n\n` +
                `Examples:\n` +
                `• ${m.prefix}tts Hello world!\n` +
                `• ${m.prefix}tts sw Habari yako\n` +
                `• ${m.prefix}tts fr Bonjour le monde\n\n` +
                `Supported languages: ${Object.keys(TTS_LANG_MAP).join(", ")}`
            );
            return;
        }

        let lang = "en";
        let text;

        // Check if first arg is a language code
        if (TTS_LANG_MAP[args[0].toLowerCase()]) {
            lang = args[0].toLowerCase();
            text = args.slice(1).join(" ").trim();
        } else {
            text = args.join(" ").trim();
        }

        // Also support quoted text from reply
        if (!text && m.quoted) {
            text = m.quoted?.conversation || m.quoted?.extendedTextMessage?.text || "";
        }

        if (!text) {
            await m.reply(`Please provide text to convert.\nUsage: ${m.prefix}tts [lang] <text>`);
            return;
        }

        if (text.length > 500) {
            await m.reply("⚠️ Text too long. Maximum is 500 characters.");
            return;
        }

        try {
            if (typeof sock.sendPresenceUpdate === "function") {
                await sock.sendPresenceUpdate("recording", m.from);
            }

            const audioBuffer = await fetchTTS(text, lang);

            await sock.sendMessage(m.from, {
                audio: audioBuffer,
                mimetype: "audio/mpeg",
                ptt: true
            }, { quoted: m.raw });

            await m.react("✅");
        } catch (err) {
            console.error("[tts] error:", err?.message || err);
            await m.react("❌");
            await m.reply(`❌ TTS failed: ${err?.message || "Unknown error"}`);
        }
    }
};
