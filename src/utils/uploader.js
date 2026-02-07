/**
 * Uploader Utilities
 * Collection of functions to upload media to various CDNs and hosting services
 */

import axios from 'axios';
import FormData from 'form-data';
import { fileTypeFromBuffer } from 'file-type';
import { log } from './logger.js';

/**
 * Upload buffer to Telegra.ph
 * @param {Buffer} buffer - File buffer
 * @returns {Promise<Object>} Object with url
 */
export async function uploadToTelegraph(buffer) {
    try {
        const { ext } = await fileTypeFromBuffer(buffer);
        const form = new FormData();
        form.append('file', buffer, { filename: `file.${ext}` });

        const { data } = await axios.post('https://telegra.ph/upload', form, {
            headers: { ...form.getHeaders() }
        });

        if (data && data[0] && data[0].src) {
            return { url: 'https://telegra.ph' + data[0].src };
        }
        throw new Error('Telegraph upload failed');
    } catch (e) {
        log.error('Telegraph upload error', e);
        throw e;
    }
}

/**
 * Upload buffer to Catbox.moe
 * @param {Buffer} buffer - File buffer
 * @returns {Promise<Object>} Object with url
 */
export async function uploadToCatbox(buffer) {
    try {
        const type = await fileTypeFromBuffer(buffer);
        const ext = type ? type.ext : 'bin';
        const form = new FormData();
        form.append('reqtype', 'fileupload');
        form.append('fileToUpload', buffer, { filename: `file.${ext}` });

        const { data } = await axios.post('https://catbox.moe/user/api.php', form, {
            headers: { ...form.getHeaders() }
        });

        if (typeof data === 'string' && data.startsWith('https://')) {
            return { url: data.trim() };
        }
        throw new Error('Catbox upload failed: ' + data);
    } catch (e) {
        log.error('Catbox upload error', e);
        throw e;
    }
}

/**
 * Upload buffer to ImgBB
 * @param {Buffer} buffer - File buffer
 * @param {string} apiKey - Optional API key (falls back to process.env.IMGBB_API_KEY)
 * @returns {Promise<Object>} Object with url
 */
export async function uploadToImgBB(buffer, apiKey = process.env.IMGBB_API_KEY) {
    if (!apiKey) {
        // Many bots use a fallback free key, but it's better to require one or fallback to telegraph
        log.warn('ImgBB API key missing, falling back to Telegraph');
        return uploadToTelegraph(buffer);
    }

    try {
        const form = new FormData();
        form.append('image', buffer.toString('base64'));

        const { data } = await axios.post(`https://api.imgbb.com/1/upload?key=${apiKey}`, form);

        if (data && data.data && data.data.url) {
            return { url: data.data.url };
        }
        throw new Error('ImgBB upload failed');
    } catch (e) {
        log.error('ImgBB upload error', e);
        throw e;
    }
}

/**
 * Upload buffer to Pixhost.to
 * @param {Buffer} buffer - File buffer
 * @returns {Promise<Object>} Object with url
 */
export async function uploadToPixhost(buffer) {
    try {
        const type = await fileTypeFromBuffer(buffer);
        const ext = type ? type.ext : 'jpg';
        const form = new FormData();
        form.append('img', buffer, { filename: `file.${ext}` });
        form.append('content_type', '0'); // 0 for safe content
        form.append('max_res', '1'); // Original resolution

        const { data } = await axios.post('https://pixhost.to/api/v0/upload', form, {
            headers: { ...form.getHeaders() }
        });

        if (data && data.show_url) {
            return { url: data.show_url };
        }
        throw new Error('Pixhost upload failed');
    } catch (e) {
        log.error('Pixhost upload error', e);
        throw e;
    }
}

/**
 * Upload buffer to GitHub CDN (Mocking for now as it needs repo config)
 * @param {Buffer} buffer - File buffer
 * @returns {Promise<Object>} Object with url
 */
export async function uploadToGithubCdn(buffer) {
    // Standard approach for bots: fallback to Catbox if GH not configured
    log.info('GitHub CDN requested, falling back to Catbox');
    return uploadToCatbox(buffer);
}

export default {
    uploadToTelegraph,
    uploadToCatbox,
    uploadToImgBB,
    uploadToPixhost,
    uploadToGithubCdn
};
