import { addCommand } from '../lib/plugins.js';

addCommand({
    pattern: 'kick',
    alias: ['remove', 'ban'],
    desc: 'Remove a participant from the group',
    handler: async (m, { conn, isGroup, isOwner, groupMetadata }) => {
        if (!isGroup) return m.reply(`${global.emojis.error} Group command only.`);

        // Check if Bot is Admin
        const botNumber = conn.user.id.split(':')[0] + '@s.whatsapp.net';
        const groupAdmins = groupMetadata.participants.filter(p => p.admin).map(p => p.id);
        const isBotAdmin = groupAdmins.includes(botNumber);

        // Check if User is Admin or Owner
        const isUserAdmin = groupAdmins.includes(m.sender);
        if (!isBotAdmin) return m.reply(`${global.emojis.error} I need to be Admin first.`);
        if (!isUserAdmin && !isOwner) return m.reply(`${global.emojis.warning} Admins only.`);

        // Get target
        let users = m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted ? m.quoted.sender : text.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
        if (!users || users.includes('@s.whatsapp.net') === false) return m.reply(`${global.emojis.warning} Tag someone to kick.`);

        try {
            await conn.groupParticipantsUpdate(m.chat, [users], 'remove');
            await m.reply(`${global.emojis.success} *Kicked* @${users.split('@')[0]}`, null, { mentions: [users] });
        } catch (e) {
            m.reply(`${global.emojis.error} Failed to kick.`);
        }
    }
});