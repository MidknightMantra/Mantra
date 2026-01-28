import { addCommand } from '../lib/plugins.js';

addCommand({
    pattern: 'unblock',
    desc: 'Unblock a user',
    handler: async (m, { conn, isOwner }) => {
        if (!isOwner) return m.reply(`${global.emojis.error} Owner only.`);

        let user = m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted ? m.quoted.sender : null;

        if (!user) return m.reply(`${global.emojis.warning} *Usage:* Reply to a user or tag them to unblock.`);

        try {
            await conn.updateBlockStatus(user, 'unblock');
            await m.reply(`${global.emojis.success} *Unblocked* @${user.split('@')[0]}`, null, { mentions: [user] });
        } catch (e) {
            console.error(e);
            m.reply(`${global.emojis.error} Failed to unblock user.`);
        }
    }
});