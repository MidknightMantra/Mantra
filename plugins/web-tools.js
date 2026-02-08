import { addCommand } from '../lib/plugins.js';
import { log } from '../src/utils/logger.js';
import axios from 'axios';
import { fileTypeFromBuffer } from 'file-type';

const API_URL = global.giftedApiUrl || 'https://api.giftedtech.my.id';
const API_KEY = global.giftedApiKey || '';

/**
 * Fetch URL Content
 */
addCommand({
    pattern: 'fetch',
    alias: ['get', 'curl'],
    react: '🌐',
    category: 'tools',
    desc: 'Fetch and display content from a URL',
    handler: async (m, { text, conn }) => {
        if (!text) return m.reply('❌ Please provide a URL.');

        await m.react('⏳');
        try {
            // Validate URL roughly
            let url = text;
            if (!url.startsWith('http')) url = 'http://' + url;

            const res = await axios.get(url, {
                responseType: 'arraybuffer',
                maxContentLength: 50 * 1024 * 1024 // 50MB limit
            });

            const taskBuffer = Buffer.from(res.data);
            const type = await fileTypeFromBuffer(taskBuffer);
            const contentType = res.headers['content-type'];

            // 1. JSON handling
            if (contentType?.includes('application/json') || (taskBuffer.toString().trim().startsWith('{') && taskBuffer.toString().trim().endsWith('}'))) {
                try {
                    const json = JSON.parse(taskBuffer.toString());
                    return m.reply('```json\n' + JSON.stringify(json, null, 2) + '\n```');
                } catch (e) { /* Not JSON */ }
            }

            // 2. Image/Video/Audio
            if (type) {
                if (type.mime.startsWith('image/')) {
                    return conn.sendMessage(m.chat, { image: taskBuffer, caption: `🌐 Fetched from: ${url}` }, { quoted: m });
                }
                if (type.mime.startsWith('video/')) {
                    return conn.sendMessage(m.chat, { video: taskBuffer, caption: `🌐 Fetched from: ${url}` }, { quoted: m });
                }
                if (type.mime.startsWith('audio/')) {
                    return conn.sendMessage(m.chat, { audio: taskBuffer, mimetype: type.mime }, { quoted: m });
                }
            }

            // 3. Fallback to Text or Document
            const limit = 4000;
            if (taskBuffer.length < limit && !contentType?.includes('stream')) {
                // Try text
                return m.reply(taskBuffer.toString());
            }

            // Document fallback
            let ext = type ? type.ext : 'bin';
            if (!type && contentType) {
                if (contentType.includes('html')) ext = 'html';
                else if (contentType.includes('text')) ext = 'txt';
            }

            const fileName = `fetch_${Date.now()}.${ext}`;
            await conn.sendMessage(m.chat, {
                document: taskBuffer,
                mimetype: contentType || 'application/octet-stream',
                fileName: fileName,
                caption: `🌐 Fetched File`
            }, { quoted: m });

            await m.react('✅');
        } catch (e) {
            log.error('Fetch error', e);
            m.reply(`❌ Fetch failed: ${e.message}`);
        }
    }
});

/**
 * Domain Check (Whois)
 */
addCommand({
    pattern: 'domaincheck',
    alias: ['whois', 'domain'],
    react: '🌐',
    category: 'tools',
    desc: 'Check domain WHOIS info',
    handler: async (m, { text }) => {
        if (!text) return m.reply('❌ Give me a domain (e.g. google.com)');
        await m.react('⏳');
        try {
            const res = await axios.get(`${API_URL}/api/tools/whois`, {
                params: { apikey: API_KEY, domain: text }
            });

            const r = res.data?.result;
            if (!r) throw new Error('No result found');

            let msg = `🌐 *Domain Info: ${r.domainName || text}*\n\n`;
            msg += `📅 *Created:* ${r.creationDate ? new Date(r.creationDate * 1000).toLocaleDateString() : 'N/A'}\n`;
            msg += `📅 *Expires:* ${r.expirationDate ? new Date(r.expirationDate * 1000).toLocaleDateString() : 'N/A'}\n`;
            msg += `🏢 *Registrar:* ${r.registrar || 'N/A'}\n`;

            if (r.nameServers) msg += `🖥️ *NS:* ${r.nameServers.join(', ')}\n`;

            await m.reply(msg);
            await m.react('✅');
        } catch (e) {
            log.error('Domain error', e);
            m.reply(`❌ Failed: ${e.message}`);
        }
    }
});

/**
 * Full Screenshot Web
 */
addCommand({
    pattern: 'ssweb',
    react: '📸',
    category: 'tools',
    desc: 'Capture full desktop screenshot of website',
    handler: async (m, { text }) => {
        if (!text) return m.reply('❌ Please provide a URL.');
        await m.react('⏳');
        try {
            const res = await axios.get(`${API_URL}/api/tools/ssweb`, {
                params: { apikey: API_KEY, url: text },
                responseType: 'arraybuffer'
            });
            await m.reply(Buffer.from(res.data), m.chat, { caption: `📸 *Full Screenshot*\n🌐 ${text}` });
            await m.react('✅');
        } catch (e) {
            log.error('SSWeb error', e);
            m.reply(`❌ Failed: ${e.message}`);
        }
    }
});
