import { addCommand } from '../lib/plugins.js';
import { log } from '../src/utils/logger.js';
import { UI } from '../src/utils/design.js';

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
            log.action('User kicked from group', 'moderation', { group: m.chat, target: users, kickedBy: m.sender });
            await m.reply(`${global.emojis.success} *Kicked* @${users.split('@')[0]}`, null, { mentions: [users] });
        } catch (e) {
            log.error('Kick failed', e, { command: 'kick', group: m.chat, target: users });
            m.reply(UI.error('Kick Failed', e.message, 'Ensure bot is admin\nTarget must be a participant\nCheck bot permissions'));
        }
    }
});