import { addCommand } from '../lib/plugins.js';
import { log } from '../src/utils/logger.js';
import { UI } from '../src/utils/design.js';

addCommand({
    pattern: 'demote',
    alias: ['unadmin'],
    desc: 'Demote an Admin',
    handler: async (m, { conn, isGroup, isOwner, groupMetadata }) => {
        if (!isGroup) return m.reply(`${global.emojis.error} Group command only.`);

        const botNumber = conn.user.id.split(':')[0] + '@s.whatsapp.net';
        const groupAdmins = groupMetadata.participants.filter(p => p.admin).map(p => p.id);
        const isBotAdmin = groupAdmins.includes(botNumber);
        const isUserAdmin = groupAdmins.includes(m.sender);

        if (!isBotAdmin) return m.reply(`${global.emojis.error} I need to be Admin first.`);
        if (!isUserAdmin && !isOwner) return m.reply(`${global.emojis.warning} Admins only.`);

        let users = m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted ? m.quoted.sender : null;
        if (!users) return m.reply(`${global.emojis.warning} Tag someone to demote.`);

        try {
            await conn.groupParticipantsUpdate(m.chat, [users], 'demote');
            log.action('Admin demoted', 'admin', { group: m.chat, target: users, demotedBy: m.sender });
            await m.reply(`${global.emojis.success} *Demoted* @${users.split('@')[0]}`, null, { mentions: [users] });
        } catch (e) {
            log.error('Demotion failed', e, { command: 'demote', group: m.chat, target: users });
            m.reply(UI.error('Demotion Failed', e.message, 'Ensure bot is admin\nTarget must be an admin\nCheck bot permissions'));
        }
    }
});