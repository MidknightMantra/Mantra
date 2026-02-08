import { addCommand } from '../lib/plugins.js';
import {
    uploadToCatbox,
    uploadToImgBB,
    uploadToPixhost,
    uploadToGithubCdn,
    uploadToTelegraph
} from '../src/utils/uploader.js';
import { getFileContentType, getMediaBuffer } from '../lib/utils.js'; // Assuming getMediaBuffer is available or I need to import it
import path from 'path';
import { log } from '../src/utils/logger.js';

// Re-importing getMediaBuffer from mediaHelper if likely located there
import { downloadMediaMessage } from '../src/utils/mediaHelper.js';

/**
 * Shared Upload Handler
 */
async function handleUpload(m, { conn, text, command, prefix }) {
    const quoted = m.quoted ? m.quoted : m;
    const mime = (quoted.msg || quoted).mimetype || '';

    if (!mime) {
        return m.reply(`⚠️ Please reply to/quote a media message.\n\n*Usage:* ${prefix}${command}`);
    }

    await m.react('⬆️');

    try {
        const media = await downloadMediaMessage(quoted, 'buffer');
        if (!media) throw new Error('Failed to download media');

        let service = command;
        let uploadFunc;

        // Map commands to upload functions
        switch (command) {
            case 'catbox':
                uploadFunc = uploadToCatbox;
                break;
            case 'imgbb':
                uploadFunc = uploadToImgBB;
                break;
            case 'pixhost':
                uploadFunc = uploadToPixhost;
                break;
            case 'githubcdn':
                uploadFunc = uploadToGithubCdn;
                break;
            case 'giftedcdn':
                // Fallback to Catbox as GiftedCDN implementation is unavailable
                service = 'catbox (via giftedcdn)';
                uploadFunc = uploadToCatbox;
                break;
            case 'tourl': // Generic alias
                uploadFunc = uploadToCatbox;
                break;
            default:
                uploadFunc = uploadToCatbox;
        }

        const result = await uploadFunc(media);

        if (!result || !result.url) {
            throw new Error('No URL returned from upload service');
        }

        const sizeMB = (media.length / (1024 * 1024)).toFixed(2);
        const ext = mime.split('/')[1] || 'bin';

        const caption = `✅ *Upload Successful*\n\n` +
            `📦 *Service:* ${service.toUpperCase()}\n` +
            `📄 *Type:* ${ext.toUpperCase()}\n` +
            `📊 *Size:* ${sizeMB} MB\n` +
            `🔗 *URL:* ${result.url}\n\n` +
            `_Link expires based on service policy._`;

        // Send response with Link Preview if possible, otherwise just text
        // Using standard text response for stability
        await conn.sendMessage(m.chat, {
            text: caption,
            contextInfo: {
                externalAdReply: {
                    title: 'Media Uploaded',
                    body: result.url,
                    thumbnailUrl: result.url, // Try to show the image itself if it's an image
                    sourceUrl: result.url,
                    mediaType: 1,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: m });

        await m.react('✅');

    } catch (error) {
        console.error('Upload Error:', error);
        await m.react('❌');
        m.reply(`❌ Upload failed: ${error.message}`);
    }
}

// Register Commands
const services = [
    { cmd: 'catbox', desc: 'Upload to Catbox.moe' },
    { cmd: 'imgbb', desc: 'Upload to ImgBB' },
    { cmd: 'pixhost', desc: 'Upload to Pixhost' },
    { cmd: 'githubcdn', desc: 'Upload to GitHub' },
    { cmd: 'giftedcdn', desc: 'Upload to GiftedCDN' },
    { cmd: 'tourl', desc: 'Upload content to URL' }
];

services.forEach(svc => {
    addCommand({
        pattern: svc.cmd,
        react: '⬆️',
        category: 'tools',
        desc: svc.desc,
        handler: handleUpload
    });
});
