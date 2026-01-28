import { addCommand } from '../lib/plugins.js';

addCommand({
    pattern: 'revoke',
    alias: ['resetlink'],
    desc: 'Reset group link',
    handler: async (m, { conn, isGroup, isOwner, groupMetadata }) => {
        if (!isGroup) return m.reply(`${global.emojis.error} Group only.`);

        const botNumber = conn.user.id.split(':')[0] + '@s.whatsapp.net';
        const groupAdmins = groupMetadata.participants.filter(p => p.admin).map(p => p.id);
        const isBotAdmin = groupAdmins.includes(botNumber);
        const isUserAdmin = groupAdmins.includes(m.sender);

        if (!isBotAdmin) return m.reply(`${global.emojis.error} I need to be Admin.`);
        if (!isUserAdmin && !isOwner) return m.reply(`${global.emojis.warning} Admins only.`);

        try {
            await conn.groupRevokeInvite(m.chat);
            m.reply(`${global.emojis.success} *Group link has been reset.*`);
        } catch (e) {
            m.reply(`${global.emojis.error} Failed to reset link.`);
        }
    }
});