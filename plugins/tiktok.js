import { addCommand } from '../lib/plugins.js';
import { UI } from '../src/utils/design.js';
import { log } from '../src/utils/logger.js';
import { validateUrl, schemas } from '../src/utils/validator.js';
import { apiCall } from '../src/utils/apiHelper.js';
import { withTimeout } from '../src/utils/timeout.js';
import { checkRateLimit } from '../lib/ratelimit.js';
import Joi from 'joi';

// TikTok URL schema
const tiktokUrlSchema = Joi.string().pattern(/tiktok\.com/).required();

addCommand({
    pattern: 'tiktok',
    alias: ['tt', 'ttdl'],
    category: 'download',
    handler: async (m, { conn, text }) => {
        try {
            // Rate limiting: 5 downloads per minute
            const rateLimit = await checkRateLimit(m.sender, 'download', 5, 60);
            if (!rateLimit.allowed) {
                return m.reply(UI.error('Rate Limit', `Too many downloads. Wait ${rateLimit.resetIn}s`, `Limit: 5 downloads per minute\nRemaining: ${rateLimit.remaining}`));
            }

            // Input validation
            const { error } = tiktokUrlSchema.validate(text);
            if (error || !text) {
                return m.reply(UI.error('Invalid URL', 'Provide a valid TikTok URL', 'Example: .tiktok https://tiktok.com/@user/video/123'));
            }

            await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });

            // Fetch with retry and timeout
            const data = await withTimeout(
                apiCall(`https://www.tikwm.com/api/?url=${encodeURIComponent(text)}`, { timeout: 15000 }, 3),
                25000,
                'TikTok download'
            );

            if (!data.data?.play) {
                throw new Error('Video not found or unavailable');
            }

            const videoData = data.data;
            const caption = `🎵 *TikTok Video*\n${global.divider}\n` +
                `📌 *Title:* ${videoData.title || 'No title'}\n` +
                `👤 *Author:* @${videoData.author?.unique_id || 'Unknown'}\n` +
                `❤️ *Likes:* ${videoData.digg_count || 0}\n` +
                `💬 *Comments:* ${videoData.comment_count || 0}\n` +
                `${global.divider}`;

            await conn.sendMessage(m.chat, {
                video: { url: videoData.play },
                caption: caption,
                mimetype: 'video/mp4'
            }, { quoted: m });

            await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

        } catch (error) {
            log.error('TikTok download failed', error, {
                command: 'tiktok',
                url: text?.substring(0, 50),
                user: m.sender
            });

            await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });

            if (error.message.includes('validation') || error.message.includes('pattern')) {
                return m.reply(UI.error('Invalid URL', 'Provide a valid TikTok link', 'Link must contain tiktok.com\\nExample: .tiktok https://tiktok.com/@user/video/123'));
            }

            if (error.message.includes('timed out')) {
                return m.reply(UI.error('Timeout', 'Download took too long', 'Video may be too large\\nTry again later\\nCheck internet connection'));
            }

            m.reply(UI.error(
                'TikTok Download Failed',
                error.message || 'Failed to download video',
                'Verify the URL is valid\\nCheck if video is public\\nVideo may be region-locked\\nTry again in a moment'
            ));
        }
    }
});