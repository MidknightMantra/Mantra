import { addCommand } from '../lib/plugins.js';
import { UI } from '../src/utils/design.js';
import { log } from '../src/utils/logger.js';
import { validateText } from '../src/utils/validator.js';
import { withTimeout } from '../src/utils/timeout.js';
import { youtube } from 'btch-downloader';

addCommand({
    pattern: 'video',
    alias: ['ytv', 'playvid'],
    category: 'download',
    handler: async (m, { conn, text }) => {
        try {
            // Input validation
            const query = validateText(text, true);

            await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });

            // Download with timeout (longer for videos)
            const data = await withTimeout(
                youtube(query),
                40000, // 40 seconds for video downloads
                'YouTube video download'
            );

            if (!data || !data.video) {
                throw new Error('Video not found or unavailable');
            }

            const caption = `🎬 *YouTube Video*\n${global.divider}\n` +
                `📌 *Title:* ${data.title}\n` +
                `⏱️ *Duration:* ${data.duration}\n` +
                `🔗 *Link:* ${text.includes('http') ? text : 'Search Result'}`;

            await conn.sendMessage(m.chat, {
                video: { url: data.video },
                mimetype: 'video/mp4',
                caption: caption
            }, { quoted: m });

            await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

        } catch (error) {
            log.error('YouTube video download failed', error, {
                command: 'video',
                query: text?.substring(0, 50),
                user: m.sender
            });

            await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });

            if (error.message.includes('validation')) {
                return m.reply(UI.error('Invalid Input', error.message, 'Provide a video name or URL\\nExample: .video Despacito\\nExample: .video https://youtu.be/xxx'));
            }

            if (error.message.includes('timed out')) {
                return m.reply(UI.error('Timeout', 'Download took too long (40s limit)', 'Video may be too long\\nTry shorter videos\\nCheck internet connection\\nTry again later'));
            }

            m.reply(UI.error(
                'Video Download Failed',
                error.message || 'Failed to fetch video',
                'Check if video exists\\nVideo may be private/age-restricted\\nTry a different video\\nAPI may be down'
            ));
        }
    }
});