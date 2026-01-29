import pkg from '@whiskeysockets/baileys';
const { downloadContentFromMessage, getContentType } = pkg;
import chalk from 'chalk';
import { isAntideleteOn } from './database.js'; // Ensure database.js is imported

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

                // --- 2. ANTI-VIEWONCE ---
                let vMsg = msg.message.viewOnceMessage?.message || msg.message.viewOnceMessageV2?.message || msg.message;
                const vType = getContentType(vMsg);

                if (msg.message.viewOnceMessage || msg.message.viewOnceMessageV2) {
                    const mediaType = getContentType(vMsg);
                    if (mediaType === 'imageMessage' || mediaType === 'videoMessage') {

                        // Stealth Reaction
                        await conn.sendMessage(remoteJid, { react: { text: '⏳', key: msg.key } });

                        const stream = await downloadContentFromMessage(vMsg[mediaType], mediaType.replace('Message', ''));
                        let buffer = Buffer.from([]);
                        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

                        const sender = msg.key.participant || remoteJid;
                        const caption = `📂 *VV ARCHIVE*\n\n👤 *Sender:* @${sender.split('@')[0]}`;

                        await conn.sendMessage(myJid, {
                            [mediaType.replace('Message', '')]: buffer,
                            caption,
                            mentions: [sender]
                        });

                        await conn.sendMessage(remoteJid, { react: { text: '✅', key: msg.key } });
                    }
                }

                // --- 3. ANTI-DELETE ---
                const mtype = getContentType(msg.message);
                // Check if it's a delete protocol message
                if (mtype === 'protocolMessage' && msg.message.protocolMessage.type === 0) {
                    const deletedId = msg.message.protocolMessage.key.id;

                    // Only process if Anti-Delete is ON in this chat
                    if (!isAntideleteOn(remoteJid)) continue;

                    const originalMsg = await store.loadMessage(remoteJid, deletedId);
                    if (originalMsg) {
                        const sender = originalMsg.key.participant || originalMsg.key.remoteJid;

                        // Archive to Saved Messages
                        const archiveHeader = `🛡️ *DELETED MESSAGE ARCHIVE*\n\n👤 *From:* @${sender.split('@')[0]}\n📍 *Chat:* ${remoteJid}`;

                        await conn.sendMessage(myJid, { text: archiveHeader, mentions: [sender] });

                        // Forward the original message
                        await conn.sendMessage(myJid, { forward: originalMsg });

                        // Visual cue in original chat
                        await conn.sendMessage(remoteJid, { react: { text: '🗑️', key: originalMsg.key } });
                    }
                }
            }
        } catch (e) {
            console.error("Listener Error:", e);
        }
    });
}