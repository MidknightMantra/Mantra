import { downloadContentFromMessage, getContentType } from '@whiskeysockets/baileys';
import chalk from 'chalk';
import fs from 'fs';

// Helper to get the Bot Owner's JID (Saved Messages)
const getSavedMessagesJID = (conn) => {
    // conn.user.id format: "254700000:12@s.whatsapp.net" -> "254700000@s.whatsapp.net"
    if (!conn.user || !conn.user.id) return null;
    return conn.user.id.split(':')[0] + '@s.whatsapp.net';
};

export async function initListeners(conn, store) {
    console.log(chalk.hex('#6A0DAD')("🔮 Listeners Initialized: AntiDelete, AntiViewOnce, AutoStatus"));

    conn.ev.on('messages.upsert', async (chatUpdate) => {
        try {
            for (const msg of chatUpdate.messages) {
                if (!msg.message) continue;

                // 1. 👁️ AUTO VIEW STATUS
                if (msg.key.remoteJid === 'status@broadcast') {
                    if (msg.key.fromMe) return;
                    await conn.readMessages([msg.key]);
                    console.log(chalk.green(`👁️ Viewed status from ${msg.pushName || 'Unknown'}`));
                }

                // 2. 👾 ANTI-VIEWONCE (Send to Saved Messages)
                const mtype = getContentType(msg.message);
                const isViewOnce = mtype === 'viewOnceMessage' || mtype === 'viewOnceMessageV2';

                if (isViewOnce) {
                    const viewOnceMsg = msg.message[mtype].message;
                    const type = Object.keys(viewOnceMsg)[0]; // imageMessage, videoMessage, etc.
                    const mediaMsg = viewOnceMsg[type];
                    const myJid = getSavedMessagesJID(conn);

                    if (myJid && (type === 'imageMessage' || type === 'videoMessage')) {
                        const stream = await downloadContentFromMessage(mediaMsg, type === 'imageMessage' ? 'image' : 'video');
                        let buffer = Buffer.from([]);
                        for await (const chunk of stream) {
                            buffer = Buffer.concat([buffer, chunk]);
                        }

                        const caption = `👾 *Mantra Anti-ViewOnce*\n\n💀 *Sender:* @${msg.key.participant.split('@')[0]}\n📝 *Caption:* ${mediaMsg.caption || 'None'}`;

                        if (type === 'imageMessage') {
                            await conn.sendMessage(myJid, { image: buffer, caption: caption, mentions: [msg.key.participant] });
                        } else if (type === 'videoMessage') {
                            await conn.sendMessage(myJid, { video: buffer, caption: caption, mentions: [msg.key.participant] });
                        }
                        console.log(chalk.hex('#6A0DAD')(`👾 Stole ViewOnce from ${msg.pushName}`));
                    }
                }

                // 3. ♻️ ANTI-DELETE
                if (mtype === 'protocolMessage' && msg.message.protocolMessage.type === 'REVOKE') {
                    if (msg.key.fromMe) return; // Ignore if YOU deleted it

                    const deletedKey = msg.message.protocolMessage.key;
                    const remoteJid = deletedKey.remoteJid;

                    // Retrieve chat from store
                    // store.messages is often a dictionary: { "jid": { array: [...] } }
                    const chatMessages = store.messages[remoteJid]?.array || [];
                    const originalMsg = chatMessages.find(m => m.key.id === deletedKey.id);

                    if (originalMsg) {
                        const sender = originalMsg.participant || originalMsg.key.participant || originalMsg.key.remoteJid;

                        // Quote the message that WAS deleted (ghost quote)
                        const quoteParams = { quoted: originalMsg, mentions: [sender] };

                        // Extract content
                        const originalType = getContentType(originalMsg.message);
                        const content = originalMsg.message[originalType];

                        let header = `♻️ *Mantra Anti-Delete*\n\n💀 *Culprit:* @${sender.split('@')[0]}\n`;

                        // Handle different message types
                        if (originalType === 'conversation') {
                            await conn.sendMessage(remoteJid, { text: header + `📝 *Message:* ${content}` }, quoteParams);
                        }
                        else if (originalType === 'extendedTextMessage') {
                            await conn.sendMessage(remoteJid, { text: header + `📝 *Message:* ${content.text}` }, quoteParams);
                        }
                        else if (originalType === 'imageMessage') {
                            const stream = await downloadContentFromMessage(content, 'image');
                            let buffer = Buffer.from([]);
                            for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
                            await conn.sendMessage(remoteJid, { image: buffer, caption: header + `📸 *Image detected*` }, quoteParams);
                        }
                        else if (originalType === 'videoMessage') {
                            const stream = await downloadContentFromMessage(content, 'video');
                            let buffer = Buffer.from([]);
                            for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
                            await conn.sendMessage(remoteJid, { video: buffer, caption: header + `🎥 *Video detected*` }, quoteParams);
                        }

                        console.log(chalk.red(`♻️ Recovered deleted message from ${sender}`));
                    }
                }
            }
        } catch (e) {
            console.error("Error in listeners:", e);
        }
    });
}