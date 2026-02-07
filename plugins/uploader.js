import { addCommand } from '../lib/plugins.js';
import { log } from '../src/utils/logger.js';
import { withReaction } from '../src/utils/messaging.js';
import { downloadMedia, requireMedia, getMimeType } from '../src/utils/mediaHelper.js';
import {
    uploadToCatbox,
    uploadToImgBB,
    uploadToPixhost,
    uploadToTelegraph,
    uploadToGithubCdn
} from '../src/utils/uploader.js';
import { sendInteractive, createRow } from '../src/utils/buttons.js';
import path from 'path';

/**
 * Generic Upload Handler
 */
async function handleUpload(m, { conn, args }, service) {
    const quoted = m.quoted || null;

    // Support all common media types for uploaders
    const allowedTypes = ['image', 'video', 'audio', 'document', 'sticker'];
    const target = requireMedia(m, quoted, allowedTypes);
    if (!target) return;

    await withReaction(conn, m, '⏳', async () => {
        try {
            // 1. Download
            const buffer = await downloadMedia(target, 20); // 20MB limit for uploaders
            if (!buffer) throw new Error('Failed to download media');

            const mediaType = Object.keys(target.message)[0];
            const originalFileName = target.message[mediaType]?.fileName || `file_${Date.now()}`;

            let uploadResult;

            // 2. Upload
            switch (service) {
                case 'catbox':
                    uploadResult = await uploadToCatbox(buffer);
                    break;
                case 'pixhost':
                    if (!mediaType.includes('image')) return m.reply('❌ Pixhost only supports image files.');
                    uploadResult = await uploadToPixhost(buffer);
                    break;
                case 'imgbb':
                    if (!mediaType.includes('image')) return m.reply('❌ ImgBB only supports image files.');
                    uploadResult = await uploadToImgBB(buffer);
                    break;
                case 'telegraph':
                case 'giftedcdn':
                    if (!mediaType.includes('image') && !mediaType.includes('video')) {
                        return m.reply('❌ Telegraph only supports images and short videos.');
                    }
                    uploadResult = await uploadToTelegraph(buffer);
                    break;
                case 'githubcdn':
                    uploadResult = await uploadToGithubCdn(buffer);
                    break;
                default:
                    uploadResult = await uploadToCatbox(buffer);
            }

            // 3. Prepare Response
            const sizeMB = (buffer.length / (1024 * 1024)).toFixed(2);
            const ext = path.extname(originalFileName).replace('.', '').toUpperCase() || 'MEDIA';

            const caption =
                `✨ *Mantra Uploader*\n` +
                `${global.divider}\n` +
                `🌐 *Service:* ${service.toUpperCase()}\n` +
                `📊 *Size:* ${sizeMB} MB\n` +
                `📄 *Type:* ${ext}\n\n` +
                `🔗 *URL:* ${uploadResult.url}\n\n` +
                `_Powered by Mantra_`;

            // 4. Send with Interactive Buttons
            await conn.sendMessage(m.chat, {
                text: caption,
                footer: global.botName,
                buttons: [
                    {
                        name: 'cta_copy',
                        buttonParamsJson: JSON.stringify({
                            display_text: 'Copy URL 📋',
                            copy_code: uploadResult.url
                        })
                    },
                    {
                        name: 'cta_url',
                        buttonParamsJson: JSON.stringify({
                            display_text: 'Open Link 🌐',
                            url: uploadResult.url
                        })
                    }
                ],
                headerType: 1
            }, { quoted: m });

        } catch (error) {
            log.error(`Upload to ${service} failed`, error);
            await m.reply(`❌ Failed to upload to ${service}.\n\nError: ${error.message}`);
        }
    });
}

// Commands
addCommand({
    pattern: 'catbox',
    desc: 'Upload media to Catbox.moe',
    category: 'tools',
    handler: async (m, context) => handleUpload(m, context, 'catbox')
});

addCommand({
    pattern: 'pixhost',
    desc: 'Upload images to Pixhost.to',
    category: 'tools',
    handler: async (m, context) => handleUpload(m, context, 'pixhost')
});

addCommand({
    pattern: 'imgbb',
    desc: 'Upload images to ImgBB',
    category: 'tools',
    handler: async (m, context) => handleUpload(m, context, 'imgbb')
});

addCommand({
    pattern: 'telegraph',
    alias: ['giftedcdn', 'tg'],
    desc: 'Upload media to Telegra.ph',
    category: 'tools',
    handler: async (m, context) => handleUpload(m, context, 'telegraph')
});

addCommand({
    pattern: 'githubcdn',
    desc: 'Upload media via GitHub CDN logic',
    category: 'tools',
    handler: async (m, context) => handleUpload(m, context, 'githubcdn')
});

log.info('Uploader plugin loaded', { commands: 5 });
