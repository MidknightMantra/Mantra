import { addCommand } from '../lib/plugins.js';
import pkg from 'gifted-baileys';
const { downloadContentFromMessage, getContentType } = pkg;

addCommand({
    pattern: 'vv',
    alias: ['viewonce', 'retrive'],
    category: 'tools',
    handler: async (m, { conn }) => {
        try {
            if (!m.quoted) return m.reply(`${global.emojis.warning} Reply to a ViewOnce message.`);

            // 1. Robust Unwrapping Logic
            // This handles Ephemeral -> ViewOnceV1/V2 -> Actual Message
            let quotedMsg = m.quoted.message || m.quoted;

            // Handle Ephemeral Wrapper
            if (quotedMsg.ephemeralMessage) quotedMsg = quotedMsg.ephemeralMessage.message;

            // Extract the type (viewOnceMessage or viewOnceMessageV2)
            let type = getContentType(quotedMsg);
            let viewOnceContent = quotedMsg[type];

            // If it's a ViewOnce wrapper, drill down into the inner message
            if (type === 'viewOnceMessage' || type === 'viewOnceMessageV2') {
                quotedMsg = viewOnceContent.message;
                type = getContentType(quotedMsg);
            }

            // Final validation check
            const isImage = type === 'imageMessage';
            const isVideo = type === 'videoMessage';

            if (!isImage && !isVideo) {
                return m.reply(`${global.emojis.error} Not a ViewOnce media file. (Detected: ${type})`);
            }

            // 2. Reaction Feedback
            await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });

            const streamType = type.replace('Message', '').toLowerCase();
            const mediaMsg = quotedMsg[type];

            // 3. Download Buffer
            const stream = await downloadContentFromMessage(mediaMsg, streamType);
            let chunks = [];
            for await (const chunk of stream) chunks.push(chunk);
            const buffer = Buffer.concat(chunks);

            const sender = m.quoted.participant || m.sender;
            const myJid = conn.user.id.split(':')[0] + '@s.whatsapp.net';
            const caption = `📂 *VV REVEALED*\n${global.divider}\n✦ *From:* @${sender.split('@')[0]}\n⏰ *Time:* ${new Date().toLocaleString()}\n📍 *Chat:* ${m.chat.includes('@g.us') ? 'Group' : 'Private'}`;

            // Send ONLY to Saved Messages (stealth)
            await conn.sendMessage(myJid, {
                [streamType]: buffer,
                caption,
                mentions: [sender]
            });



            await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

        } catch (e) {
            console.error('VV Error:', e);
            await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
        }
    }
});