import { addCommand } from '../lib/plugins.js';
import axios from 'axios';

addCommand({
    pattern: 'quran',
    alias: ['ayah', 'surah'],
    desc: 'Get a Quran verse with audio',
    handler: async (m, { conn, text }) => {
        if (!text) {
            return m.reply(`${global.emojis.warning} *Usage:* ${global.prefix}quran <Surah:Ayah>\nExample: *${global.prefix}quran 1:1* or *${global.prefix}quran 112:1*`);
        }

        try {
            // Split input (e.g. "1:1" -> surah 1, ayah 1)
            let [surah, ayah] = text.split(':');

            if (!surah || !ayah) {
                return m.reply(`${global.emojis.error} Please use the format *Surah:Ayah* (e.g., 1:5)`);
            }

            await m.reply(global.emojis.waiting);

            // Fetch Text (Arabic & English)
            const textUrl = `http://api.alquran.cloud/v1/ayah/${surah}:${ayah}/editions/quran-simple,en.asahih`;
            const textReq = await axios.get(textUrl);

            // Fetch Audio (Alafasy)
            const audioUrl = `http://api.alquran.cloud/v1/ayah/${surah}:${ayah}/ar.alafasy`;
            const audioReq = await axios.get(audioUrl);

            if (textReq.data.code !== 200 || audioReq.data.code !== 200) {
                return m.reply(`${global.emojis.error} Ayah not found. Check the numbers.`);
            }

            const arabic = textReq.data.data[0];
            const english = textReq.data.data[1];
            const audioData = audioReq.data.data;

            // Format the message
            let msg = `🔮 *MANTRA QURAN* 🔮\n\n`;
            msg += `📖 *Surah:* ${arabic.surah.englishName} (${arabic.surah.name})\n`;
            msg += `🔢 *Ayah:* ${arabic.numberInSurah}\n`;
            msg += `──────────────────\n\n`;
            msg += `🕋 *${arabic.text}*\n\n`;
            msg += `📝 _${english.text}_\n`;
            msg += `\n──────────────────`;

            // Send Audio with the text as caption
            await conn.sendMessage(m.chat, {
                audio: { url: audioData.audio },
                mimetype: 'audio/mp4',
                ptt: false, // Send as regular audio, not voice note
                contextInfo: {
                    externalAdReply: {
                        title: `Surah ${arabic.surah.englishName} : ${arabic.numberInSurah}`,
                        body: "Recitation by Mishary Rashid Alafasy",
                        thumbnailUrl: "https://i.imgur.com/6cO45Xw.jpeg", // Generic Quran Image
                        sourceUrl: "https://quran.com",
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: m });

            // Send the text caption separately if needed, but caption on audio is cleaner.
            // Since Baileys audio messages don't always support captions on all devices, 
            // we send the text message first, then the audio.

            await conn.sendMessage(m.chat, { text: msg }, { quoted: m });

        } catch (e) {
            console.error(e);
            m.reply(`${global.emojis.error} Failed to fetch Quran verse.`);
        }
    }
});