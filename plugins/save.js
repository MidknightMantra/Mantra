import { addCommand } from '../lib/plugins.js';
import pkg from 'gifted-baileys';
const { downloadContentFromMessage, getContentType } = pkg;
import chalk from 'chalk';

addCommand({
    pattern: 'save',
    alias: ['savest', 'dl', 'grab'],
    desc: 'Save status updates or media to Saved Messages',
    category: 'tools',
    handler: async (m, { conn }) => {
        try {
            // 1. Check for quoted message
            if (!m.quoted) {
                return m.reply(`${global.emojis?.warning || '⚠️'} Reply to a Status or Media message to save it.`);
            }

            await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });

            const q = m.quoted;
            const myJid = conn.user.id.split(':')[0] + '@s.whatsapp.net';

            // 2. Determine message type
            let msgContent = q.message || q;
            const msgType = getContentType(msgContent);

            console.log(chalk.cyan(`[SAVE] Attempting to save ${msgType} from ${q.sender}`));

            // 3. Handle different media types
            if (msgType === 'imageMessage' || msgType === 'videoMessage' ||
                msgType === 'audioMessage' || msgType === 'pttMessage' ||
                msgType === 'documentMessage' || msgType === 'stickerMessage') {

                const mediaMsg = msgContent[msgType];
                const mediaType = msgType.replace('Message', '');

                try {
                    // Download media
                    const stream = await downloadContentFromMessage(mediaMsg, mediaType === 'ptt' ? 'audio' : mediaType);
                    let buffer = Buffer.from([]);
                    for await (const chunk of stream) {
                        buffer = Buffer.concat([buffer, chunk]);
                    }

                    const caption = q.text || mediaMsg.caption || '';
                    const sender = q.sender || q.participant || m.sender;
                    const isStatus = m.chat === 'status@broadcast';

                    const archiveCaption = `📥 *${isStatus ? 'Status' : 'Media'} Saved*\n${global.divider || '━━━━━━━━━━━━━━━━━━━'}\n` +
                        `✦ *From:* @${sender.split('@')[0]}\n` +
                        `✦ *Type:* ${msgType}\n` +
                        `✦ *Time:* ${new Date().toLocaleString()}\n` +
                        (caption ? `✦ *Caption:* ${caption}\n` : '') +
                        `${global.divider || '━━━━━━━━━━━━━━━━━━━'}`;

                    // Build message object based on media type
                    const messageObj = {
                        caption: archiveCaption,
                        mentions: [sender]
                    };

                    if (msgType === 'imageMessage') {
                        messageObj.image = buffer;
                    } else if (msgType === 'videoMessage') {
                        messageObj.video = buffer;
                    } else if (msgType === 'audioMessage' || msgType === 'pttMessage') {
                        messageObj.audio = buffer;
                        messageObj.mimetype = mediaMsg.mimetype || 'audio/mp4';
                        messageObj.ptt = msgType === 'pttMessage';
                    } else if (msgType === 'stickerMessage') {
                        messageObj.sticker = buffer;
                        delete messageObj.caption; // Stickers don't support captions
                    } else if (msgType === 'documentMessage') {
                        messageObj.document = buffer;
                        messageObj.mimetype = mediaMsg.mimetype;
                        messageObj.fileName = mediaMsg.fileName || 'document';
                    }

                    // Send to Saved Messages
                    await conn.sendMessage(myJid, messageObj);

                    console.log(chalk.green(`[SAVE] ✅ Successfully saved ${msgType} from ${sender.split('@')[0]}`));
                } catch (downloadErr) {
                    console.error(chalk.red(`[SAVE] Download error:`, downloadErr.message));
                    throw downloadErr;
                }
            } else if (msgType === 'conversation' || msgType === 'extendedTextMessage') {
                // Text message
                const text = msgContent.conversation || msgContent.extendedTextMessage?.text || '';
                const sender = q.sender || m.sender;

                const archiveText = `📥 *Text Message Saved*\n${global.divider || '━━━━━━━━━━━━━━━━━━━'}\n` +
                    `✦ *From:* @${sender.split('@')[0]}\n` +
                    `✦ *Time:* ${new Date().toLocaleString()}\n\n` +
                    `${text}`;

                await conn.sendMessage(myJid, {
                    text: archiveText,
                    mentions: [sender]
                });

                console.log(chalk.green(`[SAVE] ✅ Saved text message from ${sender.split('@')[0]}`));
            } else {
                return m.reply(`${global.emojis?.error || '❌'} Unsupported message type: ${msgType}`);
            }

            // Success reaction
            await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

        } catch (e) {
            console.error(chalk.red('[SAVE] Error:'), e);
            await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
            m.reply(`${global.emojis?.error || '❌'} Failed to save. Media may have expired or been deleted.`);
        }
    }
});