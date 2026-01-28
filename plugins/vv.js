import { addCommand } from '../lib/plugins.js';
import pkg from '@whiskeysockets/baileys';
const { downloadContentFromMessage } = pkg;

addCommand({
    pattern: 'vv',
    handler: async (m, { conn }) => {
        try {
            if (!m.quoted) return m.reply(`${global.emojis.warning} Please reply to a ViewOnce message.`);

            // Drill down into the message (handling ephemeral and viewOnce wrappers)
            let msg = m.quoted;
            if (msg.ephemeralMessage) msg = msg.ephemeralMessage.message;

            let type = Object.keys(msg)[0];
            if (type === 'viewOnceMessage' || type === 'viewOnceMessageV2') {
                msg = msg[type].message;
                type = Object.keys(msg)[0];
            } else if (!type.includes('ImageMessage') && !type.includes('VideoMessage')) {
                return m.reply(`${global.emojis.error} That doesn't seem to be a ViewOnce message.`);
            }

            const mediaType = type;
            const streamType = mediaType.toLowerCase().replace('message', '');

            await m.reply(`${global.emojis.waiting} ⏤ *Revelation in progress...* ⏤`);

            const stream = await downloadContentFromMessage(msg[mediaType], streamType);
            let buffer = Buffer.from([]);
            for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

            const caption = `✧ *Revelation Complete* ✧\n${global.divider}\n✦ *Source:* @${(m.quoted.participant || m.sender).split('@')[0]}\n✦ *Behold its contents.*`;

            await conn.sendMessage(m.chat, {
                [streamType]: buffer,
                caption,
                mentions: [(m.quoted.participant || m.sender)]
            }, { quoted: m });

        } catch (e) {
            console.error('VV Error:', e);
            m.reply(`${global.emojis.error} ⏤ Failure during revelation. The sands of time may have already claimed this message.`);
        }
    }
});