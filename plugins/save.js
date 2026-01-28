import { addCommand } from '../lib/plugins.js';
import pkg from '@whiskeysockets/baileys';
const { downloadContentFromMessage } = pkg;
import chalk from 'chalk';

addCommand({
    pattern: 'save',
    handler: async (m, { conn }) => {
        try {
            // 1. Check if user is replying to something
            if (!m.quoted) {
                return m.reply(`${global.emojis.warning} Please reply to a Status or Image/Video with *${global.prefix}save*`);
            }

            // 2. Identify the media type of the quoted message
            // m.quoted.msg contains the actual message object (imageMessage, videoMessage, etc.)
            const q = m.quoted;
            const mime = (q.msg || q).mimetype || '';
            const msgType = Object.keys(m.quoted.message || {})[0]; // e.g., imageMessage

            // Allow saving Images, Videos, and Audio (Voice notes)
            if (!/image|video|audio/.test(mime)) {
                return m.reply(`${global.emojis.error} I can only save Images, Videos, or Audio.`);
            }

            // 3. Notify user
            await m.reply(`${global.emojis.waiting} *Downloading Status...*`);

            // 4. Download Media
            // Note: 'downloadContentFromMessage' needs the specific media object (e.g., q.msg) and type (image/video/audio)
            const stream = await downloadContentFromMessage(q.msg || q, mime.split('/')[0]);
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            // 5. Determine destination: "Saved Messages" (The Bot Owner's Chat)
            // conn.user.id format is often "254700...:15@s.whatsapp.net", we need "254700...@s.whatsapp.net"
            const myJid = conn.user.id.split(':')[0] + '@s.whatsapp.net';

            // 6. Forward the media to Saved Messages
            // We use the appropriate type key (image, video, or audio)
            let mediaTypeKey = 'image';
            if (mime.includes('video')) mediaTypeKey = 'video';
            if (mime.includes('audio')) mediaTypeKey = 'audio';

            await conn.sendMessage(myJid, {
                [mediaTypeKey]: buffer,
                caption: `🔮 *Mantra Status Saver*\n\n📄 *Caption:* ${q.text || 'No Caption'}\n👤 *From:* @${m.quoted.sender.split('@')[0]}`,
                mentions: [m.quoted.sender]
            });

            // 7. Confirm success
            await m.reply(`${global.emojis.success} *Saved to your private messages!*`);
            console.log(chalk.green(`[SAVE] Saved status from ${m.quoted.sender}`));

        } catch (e) {
            console.error("Error in save plugin:", e);
            m.reply(`${global.emojis.error} Failed to save media. It might be too old or encrypted.`);
        }
    }
});