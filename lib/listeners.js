import pkg from '@whiskeysockets/baileys';
const { downloadContentFromMessage, getContentType } = pkg;
import chalk from 'chalk';

const getSavedMessagesJID = (conn) => {
    return conn.user.id.split(':')[0] + '@s.whatsapp.net';
};

export async function initListeners(conn, store) {
    console.log(chalk.hex('#6A0DAD')("🔮 Listeners Initialized: AntiDelete, AntiViewOnce, Welcome"));

    // 1. GROUP PARTICIPANTS (Welcome/Goodbye logic remains same as your DB check)
    // ... (Your existing group-participants.update code here)

    // 2. MESSAGES UPSERT (The Core Logic)
    conn.ev.on('messages.upsert', async (chatUpdate) => {
        try {
            for (const msg of chatUpdate.messages) {
                if (!msg.message || msg.key.fromMe) continue;

                const myJid = getSavedMessagesJID(conn);
                const remoteJid = msg.key.remoteJid;

                // --- AUTO STATUS VIEW ---
                if (remoteJid === 'status@broadcast' && global.autostatus) {
                    await conn.readMessages([msg.key]);
                }

                // --- ANTI-VIEWONCE ---
                let vMsg = msg.message.ephemeralMessage?.message || msg.message;
                const vType = getContentType(vMsg);

                if (vType === 'viewOnceMessage' || vType === 'viewOnceMessageV2') {
                    const mediaMsg = vMsg[vType].message;
                    const mediaType = getContentType(mediaMsg);

                    if (mediaType === 'imageMessage' || mediaType === 'videoMessage') {
                        // Reaction in public chat
                        await conn.sendMessage(remoteJid, { react: { text: '⏳', key: msg.key } });

                        const streamType = mediaType.replace('Message', '').toLowerCase();
                        const stream = await downloadContentFromMessage(mediaMsg[mediaType], streamType);

                        let chunks = [];
                        for await (const chunk of stream) chunks.push(chunk);
                        const buffer = Buffer.concat(chunks);

                        const sender = msg.key.participant || remoteJid;
                        const caption = `📂 *VV Archive*\n${global.divider}\n✦ *Sender:* @${sender.split('@')[0]}`;

                        // Send only to Saved Messages
                        await conn.sendMessage(myJid, {
                            [streamType]: buffer,
                            caption,
                            mentions: [sender]
                        });

                        await conn.sendMessage(remoteJid, { react: { text: '✅', key: msg.key } });
                    }
                }

                // --- ANTI-DELETE ---
                const mtype = getContentType(msg.message);
                if (mtype === 'protocolMessage' && msg.message.protocolMessage.type === 20 && global.antidelete) {
                    const deletedId = msg.message.protocolMessage.key.id;
                    const originalMsg = await store.loadMessage(remoteJid, deletedId);

                    if (originalMsg) {
                        const sender = originalMsg.key.participant || originalMsg.key.remoteJid;

                        // 1. React in public chat
                        await conn.sendMessage(remoteJid, { react: { text: '🗑️', key: originalMsg.key } });

                        // 2. Archive to Saved Messages
                        const archiveHeader = `🛡️ *Anti-Delete Archive*\n${global.divider}\n✦ *From:* @${sender.split('@')[0]}`;

                        // Using copyNForward is safer/easier for all message types
                        await conn.copyNForward(myJid, originalMsg, false, {
                            caption: archiveHeader,
                            mentions: [sender]
                        });
                    }
                }
            }
        } catch (e) {
            console.error("Listener Error:", e);
        }
    });
}