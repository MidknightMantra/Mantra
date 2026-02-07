import { addCommand } from '../lib/plugins.js';
import { UI } from '../src/utils/design.js';
import { log } from '../src/utils/logger.js';
import { youtube } from 'btch-downloader'; // Stable alternative for 2026

addCommand({
    pattern: 'song',
    alias: ['play', 'music'],
    category: 'download',
    handler: async (m, { conn, text }) => {
        if (!text) return m.reply(`${global.emojis.warning} *Usage:* ${global.prefix}song <name/url>`);

        try {
            // 1. Initial Reaction
            await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });

            // 2. Fetch Audio Data
            const data = await youtube(text);
            if (!data || !data.mp3) throw new Error('Audio not found');

            // 3. Metadata for UI
            const caption = `🎵 *Song Found*\n${global.divider}\n📌 *Title:* ${data.title}\n⏱️ *Duration:* ${data.duration}`;

            // 4. Send as Audio (Voice/Music format)
            await conn.sendMessage(m.chat, {
                audio: { url: data.mp3 },
                mimetype: 'audio/mpeg',
                ptt: false // Set to true if you want it to appear as a voice note
            }, { quoted: m });

            // 5. Send as Document (to preserve filename and quality)
            await conn.sendMessage(m.chat, {
                document: { url: data.mp3 },
                mimetype: 'audio/mpeg',
                fileName: `${data.title}.mp3`,
                caption: caption
            }, { quoted: m });

            // Success Reaction
            await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

        } catch (e) {
            log.error('YouTube song download failed', e, { command: 'song', query: text?.substring(0, 50), user: m.sender });
            await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
            m.reply(UI.error('Song Download Failed', e.message || 'Failed to fetch song', 'Check if video/audio exists\nContent may be restricted\nTry a different song\nYouTube may be blocking requests'));
        }
    }
});