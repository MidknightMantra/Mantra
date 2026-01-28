import { addCommand } from '../lib/plugins.js';
import pkg from '@whiskeysockets/baileys';
const { downloadContentFromMessage } = pkg;
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import { fileTypeFromBuffer } from 'file-type';

// Helper: Upload file to Telegra.ph to get a URL
const uploadToTelegraph = async (buffer) => {
    try {
        const { ext } = await import('file-type');
        // Note: file-type is ESM. If you have issues, we can check mime from buffer directly or pass it.
        // For simplicity, let's trust the upload.

        const form = new FormData();
        form.append('file', buffer, { filename: 'tmp.jpg' });

        const { data } = await axios.post('https://telegra.ph/upload', form, {
            headers: { ...form.getHeaders() }
        });

        if (data && data[0] && data[0].src) {
            return 'https://telegra.ph' + data[0].src;
        }
        throw new Error('Upload failed');
    } catch (e) {
        throw e;
    }
};

// 1. GENERATE QR
addCommand({
    pattern: 'qr',
    desc: 'Convert text to QR Code',
    handler: async (m, { conn, text }) => {
        if (!text) return m.reply(`${global.emojis.warning} *Usage:* ${global.prefix}qr <text>`);

        try {
            await m.reply(global.emojis.waiting);
            // Using a simple reliable API for generation
            const url = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(text)}`;

            await conn.sendMessage(m.chat, {
                image: { url: url },
                caption: `🔮 *Mantra QR*\n\n📝 *Data:* ${text}`
            }, { quoted: m });

        } catch (e) {
            m.reply(`${global.emojis.error} Error creating QR.`);
        }
    }
});

// 2. READ/SCAN QR
addCommand({
    pattern: 'scan',
    alias: ['readqr', 'qrread'],
    desc: 'Read data from a QR image',
    handler: async (m, { conn }) => {
        // Check if replying to an image
        if (!m.quoted) return m.reply(`${global.emojis.warning} Reply to a QR Code image!`);

        const mime = (m.quoted.msg || m.quoted).mimetype || '';
        if (!mime.includes('image')) return m.reply(`${global.emojis.error} That is not an image.`);

        try {
            await m.reply(`${global.emojis.waiting} *Scanning...*`);

            // 1. Download image
            const stream = await downloadContentFromMessage(m.quoted.msg || m.quoted, 'image');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

            // 2. Upload to Telegra.ph to get a URL
            const imgUrl = await uploadToTelegraph(buffer);

            // 3. Use API to read the QR from that URL
            const { data } = await axios.get(`https://api.qrserver.com/v1/read-qr-code/?fileurl=${encodeURIComponent(imgUrl)}`);

            if (data && data[0] && data[0].symbol && data[0].symbol[0].data) {
                const content = data[0].symbol[0].data;
                if (!content) return m.reply(`${global.emojis.error} Could not read QR code.`);

                await conn.sendMessage(m.chat, {
                    text: `🔮 *QR Scanned Successfully*\n\n📝 *Content:* \n\`\`\`${content}\`\`\``
                }, { quoted: m });
            } else {
                throw new Error('No data');
            }

        } catch (e) {
            console.error(e);
            m.reply(`${global.emojis.error} Failed to read QR. Ensure it is clear.`);
        }
    }
});