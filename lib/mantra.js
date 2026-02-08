import { addCommand } from './plugins.js';
import { getBuffer as gmdBuffer, formatAudio, formatVideo, toAudio, toVideo, toPtt, stickerToImage, runFFmpeg, getVideoDuration } from '../src/utils/converter.js';
import { getSetting } from './database.js';
import { Sticker } from 'wa-sticker-formatter';
import path from 'path';
import fs from 'fs';
import axios from 'axios';

const MAX_MEDIA_SIZE = 100 * 1024 * 1024; // 100MB
const gitRepoRegex = /https?:\/\/github\.com\/([^\/]+)\/([^\/]+)/;

/**
 * Get file size from buffer or URL
 * @param {Buffer|string} source 
 * @returns {number}
 */
const getFileSize = async (source) => {
    if (Buffer.isBuffer(source)) return source.length;
    if (typeof source === 'string') {
        try {
            const head = await axios.head(source);
            return parseInt(head.headers['content-length'] || 0);
        } catch (e) {
            return 0;
        }
    }
    return 0;
};

/**
 * Get MIME category
 * @param {string} mime 
 * @returns {string}
 */
const getMimeCategory = (mime) => {
    if (!mime) return 'document';
    if (mime.startsWith('image/')) return 'image';
    if (mime.startsWith('audio/')) return 'audio';
    if (mime.startsWith('video/')) return 'video';
    return 'document';
};

/**
 * Random filename generator
 */
const gmdRandom = (ext) => {
    const dir = './temp_media';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    return path.join(dir, Date.now() + Math.random().toString(36).substring(7) + ext);
};

/**
 * Fancy text helper (Basic implementation)
 */
const gmdFancy = (text) => text; // Basic fallback

/**
 * Sticker creation helper
 */
const gmdSticker = async (source, options) => {
    const sticker = new Sticker(source, options);
    return sticker.toBuffer();
};

/**
 * Get MIME from URL or filename
 * @param {string} name 
 * @returns {string}
 */
const getMimeFromUrl = (name) => {
    const ext = name.split('.').pop().toLowerCase();
    const map = {
        'mp3': 'audio/mpeg',
        'm4a': 'audio/mp4',
        'wav': 'audio/wav',
        'mp4': 'video/mp4',
        'mkv': 'video/x-matroska',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'pdf': 'application/pdf',
        'apk': 'application/vnd.android.package-archive',
        'zip': 'application/zip'
    };
    return map[ext] || 'application/octet-stream';
};

/**
 * Compatibility wrapper for addCommand
 */
const gmd = (options, handler) => {
    addCommand({
        pattern: options.pattern,
        alias: options.aliases || [],
        react: options.react,
        category: options.category || 'misc',
        desc: options.description || '',
        handler: async (m, extras) => {
            const { conn, text, isOwner, isGroup, isAdmin, isBotAdmin, quoted, mentionedJid } = extras;

            // Construct conText object as expected by user code
            const conText = {
                q: text,
                mek: m,
                reply: (txt, quotedMsg) => m.reply(txt, { quoted: quotedMsg || m }),
                react: (emoji) => m.react(emoji),
                sender: m.sender,
                pushName: m.pushName,
                isSuperUser: isOwner,
                isGroup,
                isAdmin,
                isBotAdmin,
                quotedMsg: m.quoted,
                mentionedJid,
                quoted: m.quoted, // Often used interchangeably
                botName: global.botName,
                botFooter: global.divider, // Using divider as footer fallback
                newsletterJid: '120363406444239886@newsletter', // Updated channel
                newsletterUrl: 'https://whatsapp.com/channel/0029VbBs1ph6RGJIhteNql3r',
                GiftedTechApi: global.giftedApiUrl,
                GiftedApiKey: global.giftedApiKey,
                gmdBuffer: gmdBuffer,
                gmdJson: async (url) => (await axios.get(url)).data,
                formatAudio,
                formatVideo,
                toAudio,
                toVideo,
                toPtt,
                stickerToImage,
                gmdFancy,
                gmdRandom,
                getSetting,
                runFFmpeg,
                getVideoDuration,
                gmdSticker,
                gitRepoRegex,
                MAX_MEDIA_SIZE,
                ...extras // Pass everything else
            };

            return handler(m.chat, conn, conText);
        }
    });
};

export {
    gmd,
    MAX_MEDIA_SIZE,
    getFileSize,
    getMimeCategory,
    gmdRandom,
    gmdFancy,
    gmdSticker,
    getMimeFromUrl,
    gitRepoRegex,
    toAudio,
    toVideo,
    toPtt,
    stickerToImage,
    runFFmpeg,
    getVideoDuration,
    getSetting
};

export default {
    gmd,
    MAX_MEDIA_SIZE,
    getFileSize,
    getMimeCategory,
    gmdRandom,
    gmdFancy,
    gmdSticker,
    getMimeFromUrl,
    gitRepoRegex,
    toAudio,
    toVideo,
    toPtt,
    stickerToImage,
    runFFmpeg,
    getVideoDuration,
    getSetting,
    gmdBuffer
};
