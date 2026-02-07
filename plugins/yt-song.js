import { addCommand } from '../lib/plugins.js';
import { UI } from '../src/utils/design.js';
import { log } from '../src/utils/logger.js';
import { validateText, validateYouTubeUrl } from '../src/utils/validator.js';
import { withTimeout } from '../src/utils/timeout.js';
import { checkRateLimit } from '../lib/ratelimit.js';
import { youtube } from 'btch-downloader';

addCommand({
    pattern: 'song',
    alias: ['play', 'music'],
    category: 'download',
    handler: async (m, { conn, text }) => {
        try {
            // Rate limiting: 5 downloads per minute
            const rateLimit = await checkRateLimit(m.sender, 'download', 5, 60);
            if (!rateLimit.allowed) {
                return m.reply(UI.error('Rate Limit', `Too many downloads. Wait ${rateLimit.resetIn}s`, `Limit: 5 downloads per minute\nRemaining: ${rateLimit.remaining}`));
            }

            // Input validation
            const query = validateText(text, true);

            await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });

            // Fetch with timeout and retry
            const data = await withTimeout(
                youtube(query),
                30000,
                'YouTube audio fetch'
            );

            if (!data || !data.mp3) {
                throw new Error('Audio not found or unavailable');
            }

            // Metadata
            const caption = `🎵 *Song Found*\n${global.divider}\n📌 *Title:* ${data.title}\n⏱️ *Duration:* ${data.duration}`;

            // Send as audio
            await conn.sendMessage(m.chat, {
                audio: { url: data.mp3 },
                mimetype: 'audio/mpeg',
                ptt: false
            }, { quoted: m });

            // Send as document
            await conn.sendMessage(m.chat, {
                document: { url: data.mp3 },
                mimetype: 'audio/mpeg',
                fileName: `${data.title}.mp3`,
                caption: caption
            }, { quoted: m });

            await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

        } catch (error) {
            log.error('YouTube song download failed', error, {
                command: 'song',
                query: text?.substring(0, 50),
                user: m.sender
            });

            await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });

            if (error.message.includes('validation')) {
                return m.reply(UI.error('Invalid Input', error.message, 'Provide a song name or URL\\nExample: .song Despacito'));
            }

            if (error.message.includes('timed out')) {
                return m.reply(UI.error('Timeout', 'Download took too long', 'Try a shorter song\\nCheck internet connection\\nTry again later'));
            }

            m.reply(UI.error(
                'Song Download Failed',
                error.message || 'Failed to fetch song',
                'Check if video/audio exists\\nContent may be age-restricted\\nTry a different song\\nAPI may be down'
            ));
        }
    }
});