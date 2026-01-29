import { addCommand } from '../lib/plugins.js';
import axios from 'axios';

addCommand({
    pattern: 'quran',
    alias: ['ayah', 'surah'],
    category: 'tools',
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

            // 1. Initial Reaction
            await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });

            // 2. Fetch Text (Arabic & English)
            const textUrl = `http://api.alquran.cloud/v1/ayah/${surah}:${ayah}/editions/quran-simple,en.asahih`;
            const textReq = await axios.get(textUrl);

            // 3. Fetch Audio (Alafasy)
            const audioUrl = `http://api.alquran.cloud/v1/ayah/${surah}:${ayah}/ar.alafasy`;
            const audioReq = await axios.get(audioUrl);

            if (textReq.data.code !== 200 || audioReq.data.code !== 200) {
                await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
                return m.reply(`${global.emojis.error} Ayah not found. Check the numbers.`);
            }

            const arabic = textReq.data.data[0];
            const english = textReq.data.data[1];
            const audioData = audioReq.data.data;

            // 4. Format the message
            let msg = `🔮 *MANTRA QURAN* 🔮\n\n`;
            msg += `📖 *Surah:* ${arabic.surah.englishName} (${arabic.surah.name})\n`;
            msg += `🔢 *Ayah:* ${arabic.numberInSurah}\n`;
            msg += `──────────────────\n\n`;
            msg += `🕋 *${arabic.text}*\n\n`;
            msg += `📝 _${english.text}_\n`;
            msg += `\n──────────────────`;

            // 5. Send Audio with enhanced metadata
            await conn.sendMessage(m.chat, {
                audio: { url: audioData.audio },
                mimetype: 'audio/mp4',
                ptt: false,
                contextInfo: {
                    externalAdReply: {
                        title: `Surah ${arabic.surah.englishName} : ${arabic.numberInSurah}`,
                        body: "Recitation by Mishary Rashid Alafasy",
                        thumbnailUrl: "https://i.imgur.com/6cO45Xw.jpeg",
                        sourceUrl: "https://quran.com",
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: m });

            // 6. Send text message
            await conn.sendMessage(m.chat, { text: msg }, { quoted: m });

            // 7. Success Reaction
            await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

        } catch (e) {
            console.error('Quran Error:', e);
            await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
            m.reply(`${global.emojis.error} ⏤ Failed to fetch Quran verse.`);
        }
    }
});