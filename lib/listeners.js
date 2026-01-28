import pkg from '@whiskeysockets/baileys';
const { downloadContentFromMessage, getContentType } = pkg;
import chalk from 'chalk';
import fs from 'fs';
import { isWelcomeOn } from './database.js'; // <--- IMPORT DB CHECK

const getSavedMessagesJID = (conn) => {
    if (!conn.user || !conn.user.id) return null;
    return conn.user.id.split(':')[0] + '@s.whatsapp.net';
};

export async function initListeners(conn, store) {
    console.log(chalk.hex('#6A0DAD')("🔮 Listeners Initialized: AntiDelete, AntiViewOnce, Welcome"));

    // 1. GROUP PARTICIPANTS UPDATE (Welcome/Goodbye)
    conn.ev.on('group-participants.update', async (update) => {
        const { id, participants, action } = update;

        // CHECK DATABASE: If default is off, this returns false and stops here.
        if (!isWelcomeOn(id)) return;

        try {
            const metadata = await conn.groupMetadata(id);

            for (const num of participants) {
                // Get Profile Picture (fall back to default if failed)
                let pp = 'https://i.imgur.com/6cO45Xw.jpeg';
                try {
                    pp = await conn.profilePictureUrl(num, 'image');
                } catch { }

                if (action === 'add') {
                    // WELCOME MESSAGE
                    const welcomeText = `🔮 *Welcome to ${metadata.subject}* 🔮\n\n👤 @${num.split('@')[0]}\n\n_Read the description and behave!_`;
                    await conn.sendMessage(id, {
                        image: { url: pp },
                        caption: welcomeText,
                        mentions: [num]
                    });
                } else if (action === 'remove') {
                    // GOODBYE MESSAGE
                    const goodbyeText = `💀 *Goodbye* @${num.split('@')[0]}\n\n_We won't miss you._`;
                    await conn.sendMessage(id, {
                        text: goodbyeText,
                        mentions: [num]
                    });
                }
            }
        } catch (e) {
            console.error('Welcome Error:', e);
        }
    });

    // 2. MESSAGES UPSERT (Anti-Delete / Anti-ViewOnce)
    conn.ev.on('messages.upsert', async (chatUpdate) => {
        try {
            for (const msg of chatUpdate.messages) {
                if (!msg.message) continue;

                // Auto View Status
                if (msg.key.remoteJid === 'status@broadcast' && global.autostatus) {
                    if (msg.key.fromMe) return;
                    await conn.readMessages([msg.key]);
                }

                const mtype = getContentType(msg.message);

                // Anti-ViewOnce
                let vMsg = msg.message;
                if (vMsg.ephemeralMessage) vMsg = vMsg.ephemeralMessage.message;
                const vType = getContentType(vMsg);

                const isViewOnce = vType === 'viewOnceMessage' || vType === 'viewOnceMessageV2';
                if (isViewOnce) {
                    const viewOnceMsg = vMsg[vType].message;
                    const mediaType = getContentType(viewOnceMsg);
                    const mediaMsg = viewOnceMsg[mediaType];
                    const myJid = getSavedMessagesJID(conn);

                    if (myJid && (mediaType === 'imageMessage' || mediaType === 'videoMessage')) {
                        const streamType = mediaType.replace('Message', '').toLowerCase();
                        const stream = await downloadContentFromMessage(mediaMsg, streamType);
                        let buffer = Buffer.from([]);
                        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

                        const sender = msg.key.participant || msg.key.remoteJid;
                        const caption = `✧ *ViewOnce Recovered* ✧\n${global.divider}\n✦ *Sender:* @${sender.split('@')[0]}`;

                        await conn.sendMessage(myJid, { [streamType]: buffer, caption: caption, mentions: [sender] });
                    }
                }

                // Anti-Delete
                if (mtype === 'protocolMessage' && msg.message.protocolMessage.type === 'REVOKE' && global.antidelete) {
                    if (msg.key.fromMe) return;

                    const deletedKey = msg.message.protocolMessage.key;
                    const remoteJid = deletedKey.remoteJid;
                    const chatMessages = store.messages[remoteJid]?.array || [];
                    const originalMsg = chatMessages.find(m => m.key.id === deletedKey.id);

                    if (originalMsg) {
                        const sender = originalMsg.participant || originalMsg.key.participant || originalMsg.key.remoteJid;
                        const quoteParams = { quoted: originalMsg, mentions: [sender] };
                        const originalType = getContentType(originalMsg.message);
                        const content = originalMsg.message[originalType];
                        let header = `✧ *Deletion Detected* ✧\n${global.divider}\n✦ *Culprit:* @${sender.split('@')[0]}\n`;

                        if (originalType === 'conversation') await conn.sendMessage(remoteJid, { text: header + `✦ *Original:* ${content}` }, quoteParams);
                        else if (originalType === 'extendedTextMessage') await conn.sendMessage(remoteJid, { text: header + `✦ *Original:* ${content.text}` }, quoteParams);
                        else if (originalType === 'imageMessage') {
                            const stream = await downloadContentFromMessage(content, 'image');
                            let buffer = Buffer.from([]);
                            for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
                            await conn.sendMessage(remoteJid, { image: buffer, caption: header + `✦ *Image recovered*` }, quoteParams);
                        }
                    }
                }
            }
        } catch (e) {
            console.error("Listener Error:", e);
        }
    });
}