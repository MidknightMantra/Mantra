import pkg from 'gifted-baileys';
const { downloadContentFromMessage, getContentType } = pkg;
import chalk from 'chalk';

const getSavedMessagesJID = (conn) => {
    return conn.user.id.split(':')[0] + '@s.whatsapp.net';
};

export async function initListeners(conn, store) {
    console.log(chalk.hex('#6A0DAD')("🔮 Listeners Initialized: AntiDelete, AntiViewOnce, AutoStatus"));

    conn.ev.on('messages.upsert', async (chatUpdate) => {
        try {
            for (const msg of chatUpdate.messages) {
                if (!msg.message || msg.key.fromMe) continue;

                const myJid = getSavedMessagesJID(conn);
                const remoteJid = msg.key.remoteJid;

                // --- 1. AUTO STATUS VIEW ---
                if (remoteJid === 'status@broadcast') {
                    await conn.readMessages([msg.key]);
                    continue;
                }

                // --- 2. ANTI-VIEWONCE (COMPLETE STEALTH - DON'T OPEN IN CHAT) ---
                let msgToCheck = msg.message;

                // IMPORTANT: Handle ephemeral wrapper (view-once can be wrapped in ephemeralMessage)
                if (msgToCheck.ephemeralMessage) {
                    msgToCheck = msgToCheck.ephemeralMessage.message;
                }

                const msgType = getContentType(msgToCheck);

                if (msgType === 'viewOnceMessage' || msgType === 'viewOnceMessageV2') {
                    console.log(chalk.cyan(`[ANTI-VV] 🔍 Detected ${msgType} from ${msg.key.participant || remoteJid}`));

                    try {
                        // Extract the actual media message from ViewOnce wrapper
                        let vMsg = msgToCheck[msgType].message;
                        const mediaType = getContentType(vMsg);

                        console.log(chalk.cyan(`[ANTI-VV] 📦 Media type: ${mediaType}`));

                        if (mediaType === 'imageMessage' || mediaType === 'videoMessage') {
                            // Download media silently WITHOUT reading/opening the message
                            const stream = await downloadContentFromMessage(vMsg[mediaType], mediaType.replace('Message', ''));
                            let buffer = Buffer.from([]);
                            for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

                            const sender = msg.key.participant || remoteJid;
                            const caption = `📂 *VV ARCHIVE*\n\n👤 *Sender:* @${sender.split('@')[0]}\n⏰ *Time:* ${new Date().toLocaleString()}\n🔒 *Stealth:* Saved without opening`;

                            // Send ONLY to Saved Messages (completely stealth)
                            await conn.sendMessage(myJid, {
                                [mediaType.replace('Message', '')]: buffer,
                                caption,
                                mentions: [sender]
                            });

                            console.log(chalk.green(`[ANTI-VV] ✅ Successfully saved ${mediaType} from ${sender.split('@')[0]} to Saved Messages`));
                        } else {
                            console.log(chalk.yellow(`[ANTI-VV] ⚠️ Unsupported media type: ${mediaType}`));
                        }
                    } catch (e) {
                        console.error(chalk.red(`[ANTI-VV] ❌ Error saving view-once:`, e.message));
                        console.error(chalk.red(`[ANTI-VV] Stack:`, e.stack));
                    }

                    // CRITICAL: Skip processing this message entirely to prevent opening it
                    continue;
                }

                // --- 3. ANTI-DELETE (NOW GLOBAL - ALWAYS ON) ---
                const mtype = getContentType(msg.message);
                // Check if it's a delete protocol message (type 0 = REVOKE)
                if (mtype === 'protocolMessage' && msg.message.protocolMessage.type === 0) {
                    const deletedId = msg.message.protocolMessage.key.id;

                    console.log(chalk.yellow(`[ANTI-DELETE] Delete detected in ${remoteJid}, message ID: ${deletedId}`));

                    try {
                        const originalMsg = await store.loadMessage(remoteJid, deletedId);

                        if (originalMsg && originalMsg.message) {
                            const sender = originalMsg.key.participant || originalMsg.key.remoteJid;
                            const chatType = remoteJid.includes('@g.us') ? 'Group' : 'DM';

                            console.log(chalk.green(`[ANTI-DELETE] Found original message from ${sender}`));

                            // Archive header
                            const archiveHeader = `🛡️ *DELETED MESSAGE*\n\n👤 *From:* @${sender.split('@')[0]}\n📍 *Type:* ${chatType}\n⏰ *Time:* ${new Date().toLocaleString()}`;

                            await conn.sendMessage(myJid, { text: archiveHeader, mentions: [sender] });

                            // Extract and forward the actual message content
                            const msgType = getContentType(originalMsg.message);
                            const content = originalMsg.message[msgType];

                            // Forward based on message type
                            if (msgType === 'conversation' || msgType === 'extendedTextMessage') {
                                const text = originalMsg.message.conversation || content.text || '';
                                await conn.sendMessage(myJid, { text: `📝 *Message:*\n${text}` });
                            } else if (msgType === 'imageMessage') {
                                const caption = content.caption || '';
                                await conn.sendMessage(myJid, {
                                    image: await downloadContentFromMessage(content, 'image').then(async stream => {
                                        let buffer = Buffer.from([]);
                                        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
                                        return buffer;
                                    }),
                                    caption: caption ? `📷 *Caption:*\n${caption}` : '📷 *Deleted Image*'
                                });
                            } else if (msgType === 'videoMessage') {
                                const caption = content.caption || '';
                                await conn.sendMessage(myJid, {
                                    video: await downloadContentFromMessage(content, 'video').then(async stream => {
                                        let buffer = Buffer.from([]);
                                        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
                                        return buffer;
                                    }),
                                    caption: caption ? `🎥 *Caption:*\n${caption}` : '🎥 *Deleted Video*'
                                });
                            } else if (msgType === 'audioMessage' || msgType === 'pttMessage') {
                                await conn.sendMessage(myJid, {
                                    audio: await downloadContentFromMessage(content, 'audio').then(async stream => {
                                        let buffer = Buffer.from([]);
                                        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
                                        return buffer;
                                    }),
                                    mimetype: 'audio/mp4',
                                    ptt: msgType === 'pttMessage'
                                });
                            } else if (msgType === 'stickerMessage') {
                                await conn.sendMessage(myJid, {
                                    sticker: await downloadContentFromMessage(content, 'sticker').then(async stream => {
                                        let buffer = Buffer.from([]);
                                        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
                                        return buffer;
                                    })
                                });
                            } else if (msgType === 'documentMessage') {
                                await conn.sendMessage(myJid, {
                                    document: await downloadContentFromMessage(content, 'document').then(async stream => {
                                        let buffer = Buffer.from([]);
                                        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
                                        return buffer;
                                    }),
                                    mimetype: content.mimetype,
                                    fileName: content.fileName
                                });
                            } else {
                                // Fallback for other types
                                await conn.sendMessage(myJid, { text: `📦 *Deleted ${msgType}* (Content not fully captured)` });
                            }

                            // Visual cue in original chat
                            await conn.sendMessage(remoteJid, { react: { text: '🗑️', key: originalMsg.key } });

                            console.log(chalk.green(`[ANTI-DELETE] ✅ Successfully archived ${msgType}`));
                        } else {
                            console.log(chalk.red(`[ANTI-DELETE] ❌ Original message not found in store`));
                            await conn.sendMessage(myJid, { text: `🛡️ *Message Deleted*\n\n⚠️ Content was not cached (message too old or not loaded in store)` });
                        }
                    } catch (err) {
                        console.error(chalk.red(`[ANTI-DELETE] Error:`, err.message));
                    }
                }
            }
        } catch (e) {
            console.error("Listener Error:", e);
        }
    });
}