import { addCommand } from '../lib/plugins.js';
import { UI } from '../src/utils/design.js';
import { log } from '../src/utils/logger.js';
import pkg from 'gifted-baileys';
const { downloadContentFromMessage, getContentType } = pkg;

addCommand({
    pattern: 'vv',
    alias: ['viewonce', 'retrieve'],
    desc: 'Reveal ViewOnce media and send to Saved Messages.',
    category: 'tools',
    handler: async (m, { conn }) => {

        if (!m.quoted) {
            return m.reply(`${global.emojis.warning} *Usage:* Reply to a ViewOnce message with *${global.prefix}vv*`);
        }

        try {
            // 1. Initial Reaction
            await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });

            // 2. Robust Unwrapping Logic
            let quotedMsg = m.quoted.message || m.quoted;

            // Handle Ephemeral Wrapper
            if (quotedMsg.ephemeralMessage) {
                quotedMsg = quotedMsg.ephemeralMessage.message;
            }

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
            const isAudio = type === 'audioMessage'; // Adding support for audio if possible in ViewOnce

            if (!isImage && !isVideo && !isAudio) {
                await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
                return m.reply(`${global.emojis.error} Not a supported ViewOnce media type. (Detected: ${type})`);
            }

            const streamType = type.replace('Message', '').toLowerCase();
            const mediaMsg = quotedMsg[type];

            // 3. Download Buffer
            const stream = await downloadContentFromMessage(mediaMsg, streamType);
            let chunks = [];
            for await (const chunk of stream) {
                chunks.push(chunk);
            }
            const buffer = Buffer.concat(chunks);

            if (buffer.length === 0) {
                await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
                return m.reply(`${global.emojis.error} Failed to download media (empty buffer).`);
            }

            // 4. Prepare Metadata
            const sender = m.quoted.participant || m.sender;
            const myJid = conn.user.id.split(':')[0] + '@s.whatsapp.net';
            const chatType = m.chat.includes('@g.us') ? 'Group' : 'Private';
            const timestamp = new Date(m.quoted.messageTimestamp * 1000).toLocaleString(); // Use original timestamp if available

            let caption = `📂 *VIEWONCE REVEALED* ✧\n${global.divider}\n`;
            caption += `✦ *From:* @${sender.split('@')[0]}\n`;
            caption += `✦ *Original Time:* ${timestamp}\n`;
            caption += `✦ *Chat:* ${chatType}\n`;
            caption += `✦ *Type:* ${streamType.toUpperCase()}\n`;
            if (mediaMsg.caption) {
                caption += `✦ *Original Caption:* ${mediaMsg.caption}\n`;
            }
            caption += `\n${global.divider}\nRevealed by: @${myJid.split('@')[0]} at ${new Date().toLocaleString()}`;

            // 5. Send to Saved Messages (stealth)
            await conn.sendMessage(myJid, {
                [streamType]: { url: buffer, mimetype: mediaMsg.mimetype || `application/${streamType}` },
                caption,
                mentions: [sender, myJid]
            }, { quoted: m });

            // 6. Confirm in Original Chat
            await m.reply(`${global.emojis.success} ViewOnce media revealed and sent to your Saved Messages.`);

            // 7. Success Reaction
            await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

        } catch (e) {
            log.error('ViewOnce reveal failed', e, { command: 'vv', user: m.sender });
            await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
            m.reply(UI.error('ViewOnce Reveal Failed', e.message || 'Failed to reveal media', 'Reply to a ViewOnce message\nEnsure message hasn\'t expired\nCheck your internet connection'));
        }
    }
});
