import { addCommand } from '../lib/plugins.js';
import { UI } from '../src/utils/design.js';
import { log } from '../src/utils/logger.js';

addCommand({
    pattern: 'add',
    desc: 'Add a user to the group',
    handler: async (m, { conn, text, isGroup, isOwner, groupMetadata }) => {
        if (!isGroup) return m.reply(`${global.emojis.error} Group only.`);

        // Permission Check
        const botNumber = conn.user.id.split(':')[0] + '@s.whatsapp.net';
        const groupAdmins = groupMetadata.participants.filter(p => p.admin).map(p => p.id);
        const isBotAdmin = groupAdmins.includes(botNumber);
        const isUserAdmin = groupAdmins.includes(m.sender);

        if (!isBotAdmin) return m.reply(`${global.emojis.error} I need to be Admin first.`);
        if (!isUserAdmin && !isOwner) return m.reply(`${global.emojis.warning} Admins only.`);

        if (!text) return m.reply(`${global.emojis.warning} *Usage:* ${global.prefix}add 254700000000`);

        // Clean the number
        let users = text.replace(/[^0-9]/g, '') + '@s.whatsapp.net';

        try {
            // Attempt to add
            const res = await conn.groupParticipantsUpdate(m.chat, [users], 'add');

            // Check result
            if (res[0].status === '200') {
                m.reply(`${global.emojis.success} *Added* @${users.split('@')[0]}`, null, { mentions: [users] });
            } else if (res[0].status === '403') {
                // If privacy restricts adding, send invite link
                m.reply(`${global.emojis.info} User has privacy settings on. Sending invite link...`);
                const code = await conn.groupInviteCode(m.chat);
                const link = `https://chat.whatsapp.com/${code}`;
                await conn.sendMessage(users, { text: `🔮 *Group Invite*\n\nSomeone tried to add you to *${groupMetadata.subject}*.\n\n🔗 ${link}` });
            } else {
                m.reply(`${global.emojis.error} Failed to add user.`);
            }
        } catch (e) {
            log.error('Add command failed', e, { command: 'add', targetUser: users, chat: m.chat, user: m.sender });
            m.reply(UI.error('Add User Failed', e.message || 'Error adding user', 'Verify number is correct\nEnsure bot has admin rights\nCheck group settings'));
        }
    }
});