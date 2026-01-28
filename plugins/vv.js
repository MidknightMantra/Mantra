import { addCommand } from '../lib/plugins.js';
import { downloadContentFromMessage } from '@whiskeysockets/baileys';

addCommand({
    pattern: 'vv',
    handler: async (m, { conn }) => {
        try {
            // 1. Check if the user is replying to a message
            if (!m.quoted) {
                return m.reply(`${global.emojis.warning} Reply to a ViewOnce message with *${global.prefix}vv*`);
            }

            // 2. Analyze the quoted message structure
            // ViewOnce messages are often nested inside 'viewOnceMessageV2' or 'viewOnceMessage'
            let msg = m.quoted.message;
            let type = Object.keys(msg)[0];

            // Check if it's actually a ViewOnce message
            if (type !== 'viewOnceMessage' && type !== 'viewOnceMessageV2') {
                return m.reply(`${global.emojis.error} That is not a ViewOnce message.`);
            }

            // 3. Extract the actual media message (image/video) from inside the ViewOnce wrapper
            let mediaMsg = msg[type].message;
            let mediaType = Object.keys(mediaMsg)[0]; // 'imageMessage' or 'videoMessage'

            await m.reply(`${global.emojis.waiting} *Revealing ViewOnce...*`);

            // 4. Download the stream
            // We pass the inner media object and the type (removing 'Message' suffix for the download function)
            let streamType = mediaType === 'imageMessage' ? 'image' : 'video';
            let stream = await downloadContentFromMessage(mediaMsg[mediaType], streamType);

            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            // 5. Send back as normal media
            if (mediaType === 'imageMessage') {
                await conn.sendMessage(m.chat, {
                    image: buffer,
                    caption: `🔮 *Mantra Revealed*\n\n🔓 *Opened for:* @${m.sender.split('@')[0]}`,
                    mentions: [m.sender]
                }, { quoted: m });
            } else if (mediaType === 'videoMessage') {
                await conn.sendMessage(m.chat, {
                    video: buffer,
                    caption: `🔮 *Mantra Revealed*\n\n🔓 *Opened for:* @${m.sender.split('@')[0]}`,
                    mentions: [m.sender]
                }, { quoted: m });
            }

        } catch (e) {
            console.error(e);
            m.reply(`${global.emojis.error} Failed to reveal. The media might be expired or already downloaded.`);
        }
    }
});