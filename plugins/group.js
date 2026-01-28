import { addCommand } from '../lib/plugins.js';

addCommand({
    pattern: 'tagall',
    handler: async (m, { conn, isGroup, groupMetadata, text, isOwner }) => {
        if (!isGroup) return m.reply('Group only command.');
        if (!isOwner && !m.key.fromMe) return m.reply('Admin/Owner only.'); // Basic check

        let members = groupMetadata.participants;
        let txt = `*TAG ALL*\n\nMessage: ${text || 'Hello!'}\n\n`;

        for (let mem of members) {
            txt += `@${mem.id.split('@')[0]}\n`;
        }

        conn.sendMessage(m.chat, { text: txt, mentions: members.map(a => a.id) }, { quoted: m });
    }
});

addCommand({
    pattern: 'kick',
    handler: async (m, { conn, isGroup, text }) => {
        if (!isGroup) return m.reply('Group only.');
        if (!m.mentionedJid[0]) return m.reply('Tag someone to kick.');
        await conn.groupParticipantsUpdate(m.chat, [m.mentionedJid[0]], 'remove');
        m.reply('User kicked.');
    }
});