import { addCommand } from '../lib/plugins.js';
import pkg from 'gifted-baileys';
const { downloadContentFromMessage } = pkg;
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import { fileTypeFromBuffer } from 'file-type';

// Helper: Upload file to Telegra.ph to get a URL
const uploadToTelegraph = async (buffer) => {
    try {
        const { ext } = await import('file-type');
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
    category: 'tools',
    handler: async (m, { conn, text }) => {
        if (!text) return m.reply(`${global.emojis.warning} *Usage:* ${global.prefix}qr <text>`);

        try {
            // 1. Initial Reaction
            await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });

            // 2. Generate QR
            const url = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(text)}`;

            // 3. Send QR Image
            await conn.sendMessage(m.chat, {
                image: { url: url },
                caption: `🔮 *Mantra QR*\n${global.divider}\n📝 *Data:* ${text}`
            }, { quoted: m });

            // 4. Success Reaction
            await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

        } catch (e) {
            console.error('QR Error:', e);
            await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
            m.reply(`${global.emojis.error} ⏤ Error creating QR code.`);
        }
    }
});

// 2. READ/SCAN QR
addCommand({
    pattern: 'scan',
    alias: ['readqr', 'qrread'],
    category: 'tools',
    handler: async (m, { conn }) => {
        if (!m.quoted) return m.reply(`${global.emojis.warning} Reply to a QR Code image!`);

        const mime = (m.quoted.msg || m.quoted).mimetype || '';
        if (!mime.includes('image')) return m.reply(`${global.emojis.error} That is not an image.`);

        try {
            // 1. Initial Reaction
            await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });

            // 2. Download image
            const stream = await downloadContentFromMessage(m.quoted.msg || m.quoted, 'image');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

            // 3. Upload to Telegra.ph to get a URL
            const imgUrl = await uploadToTelegraph(buffer);

            // 4. Use API to read the QR from that URL
            const { data } = await axios.get(`https://api.qrserver.com/v1/read-qr-code/?fileurl=${encodeURIComponent(imgUrl)}`);

            if (data && data[0] && data[0].symbol && data[0].symbol[0].data) {
                const content = data[0].symbol[0].data;
                if (!content) {
                    await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
                    return m.reply(`${global.emojis.error} Could not read QR code.`);
                }

                // 5. Send Result
                await conn.sendMessage(m.chat, {
                    text: `🔮 *QR Scanned Successfully*\n${global.divider}\n📝 *Content:* \n\`\`\`${content}\`\`\``
                }, { quoted: m });

                // 6. Success Reaction
                await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });
            } else {
                throw new Error('No data');
            }

        } catch (e) {
            console.error('QR Scan Error:', e);
            await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
            m.reply(`${global.emojis.error} ⏤ Failed to read QR. Ensure it is clear and properly formatted.`);
        }
    }
});