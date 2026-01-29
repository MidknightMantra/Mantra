import { addCommand } from '../lib/plugins.js';
import pkg from '@whiskeysockets/baileys';
const { downloadContentFromMessage } = pkg;

addCommand({
    pattern: 'vv',
    handler: async (m, { conn }) => {
        try {
            // 1. Initial check for quoted message
            let quoted = m.quoted ? m.quoted : null;
            if (!quoted) return m.reply(`${global.emojis.warning} Please reply to a ViewOnce message.`);

            // 2. Unwrapping the message layers
            // Handles Ephemeral -> ViewOnceV1/V2 -> Actual Message Content
            let msg = quoted.ephemeralMessage?.message || quoted;
            const viewOnceType = Object.keys(msg)[0];

            if (viewOnceType === 'viewOnceMessage' || viewOnceType === 'viewOnceMessageV2') {
                msg = msg[viewOnceType].message;
            }

            const mediaType = Object.keys(msg)[0];
            const isImage = mediaType === 'imageMessage';
            const isVideo = mediaType === 'videoMessage';

            if (!isImage && !isVideo) {
                return m.reply(`${global.emojis.error} This doesn't appear to be a ViewOnce image or video.`);
            }

            await m.reply(`${global.emojis.waiting} ⏤ *Revelation in progress...* ⏤`);

            // 3. Efficient Buffer Handling
            const streamType = mediaType.replace('Message', '');
            const stream = await downloadContentFromMessage(msg[mediaType], streamType);

            let chunks = [];
            for await (const chunk of stream) {
                chunks.push(chunk);
            }
            const buffer = Buffer.concat(chunks);

            // 4. Constructing Metadata
            const sender = quoted.participant || m.sender;
            const caption = `✧ *Revelation Complete* ✧\n${global.divider}\n✦ *Source:* @${sender.split('@')[0]}\n✦ *Behold its contents.*`;

            // 5. Delivery
            await conn.sendMessage(m.chat, {
                [streamType]: buffer,
                caption,
                mentions: [sender]
            }, { quoted: m });

        } catch (e) {
            console.error('VV Error:', e);
            m.reply(`${global.emojis.error} ⏤ Failure during revelation. The sands of time may have already claimed this message.`);
        }
    }
});