import { addCommand } from '../lib/plugins.js';
import { log } from '../src/utils/logger.js';

addCommand({
    pattern: 'jid',
    alias: ['id', 'getid'],
    desc: 'Get JID of chat or user',
    handler: async (m, { conn }) => {
        let jid = m.chat;

        // If replying, get the sender's JID instead of the chat's JID
        if (m.quoted) {
            jid = m.quoted.sender;
        } else if (m.mentionedJid && m.mentionedJid.length > 0) {
            jid = m.mentionedJid[0];
        }

        await conn.sendMessage(m.chat, {
            text: `🔮 *MANTRA ID SYSTEM*\n\n🆔 *JID:* \`${jid}\``
        }, { quoted: m });
    }
});