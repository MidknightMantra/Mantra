import { addCommand } from '../lib/plugins.js';
import pkg from '@whiskeysockets/baileys';
const { downloadContentFromMessage } = pkg;

addCommand({
    pattern: 'vv',
    handler: async (m, { conn }) => {
        try {
            if (!m.quoted) return m.reply(`${global.emojis.warning} Reply to a ViewOnce message.`);

            // 1. Unwrap Message Layers
            let msg = m.quoted.ephemeralMessage?.message || m.quoted;
            let type = Object.keys(msg)[0];

            if (type === 'viewOnceMessage' || type === 'viewOnceMessageV2') {
                msg = msg[type].message;
                type = Object.keys(msg)[0];
            }

            if (!type.includes('ImageMessage') && !type.includes('VideoMessage')) {
                return m.reply(`${global.emojis.error} Not a ViewOnce media file.`);
            }

            // 2. Visual Feedback (Reaction)
            await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });

            const mediaType = type;
            const streamType = mediaType.toLowerCase().replace('message', '');

            // 3. Download Buffer
            const stream = await downloadContentFromMessage(msg[mediaType], streamType);
            let chunks = [];
            for await (const chunk of stream) chunks.push(chunk);
            const buffer = Buffer.concat(chunks);

            const sender = m.quoted.participant || m.sender;
            const caption = `✅ *ViewOnce Downloaded*\n${global.divider}\nFrom: @${sender.split('@')[0]}`;

            // 4. Send to Current Chat
            await conn.sendMessage(m.chat, {
                [streamType]: buffer,
                caption,
                mentions: [sender]
            }, { quoted: m });

            // 5. Send to Saved Messages (Self)
            const myJid = conn.user.id.split(':')[0] + '@s.whatsapp.net';
            if (m.chat !== myJid) {
                await conn.sendMessage(myJid, {
                    [streamType]: buffer,
                    caption: `📂 *Auto-Archived*\n${global.divider}\nFrom: @${sender.split('@')[0]}`,
                    mentions: [sender]
                });
            }

            // Success Reaction
            await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

        } catch (e) {
            console.error('VV Error:', e);
            await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
        }
    }
});