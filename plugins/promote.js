import { addCommand } from '../lib/plugins.js';

addCommand({
    pattern: 'promote',
    alias: ['admin'],
    desc: 'Make a user an Admin',
    handler: async (m, { conn, isGroup, isOwner, groupMetadata }) => {
        if (!isGroup) return m.reply(`${global.emojis.error} Group command only.`);

        const botNumber = conn.user.id.split(':')[0] + '@s.whatsapp.net';
        const groupAdmins = groupMetadata.participants.filter(p => p.admin).map(p => p.id);
        const isBotAdmin = groupAdmins.includes(botNumber);
        const isUserAdmin = groupAdmins.includes(m.sender);

        if (!isBotAdmin) return m.reply(`${global.emojis.error} I need to be Admin first.`);
        if (!isUserAdmin && !isOwner) return m.reply(`${global.emojis.warning} Admins only.`);

        let users = m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted ? m.quoted.sender : null;
        if (!users) return m.reply(`${global.emojis.warning} Tag someone to promote.`);

        try {
            await conn.groupParticipantsUpdate(m.chat, [users], 'promote');
            await m.reply(`${global.emojis.success} *Promoted* @${users.split('@')[0]}`, null, { mentions: [users] });
        } catch (e) {
            m.reply(`${global.emojis.error} Failed.`);
        }
    }
});