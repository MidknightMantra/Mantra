import { addCommand } from '../lib/plugins.js';

addCommand({
    pattern: 'block',
    desc: 'Block a user',
    handler: async (m, { conn, isOwner }) => {
        if (!isOwner) return m.reply(`${global.emojis.error} Owner only.`);

        // Determine target: Mentioned user OR Replied user
        let user = m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted ? m.quoted.sender : null;

        if (!user) return m.reply(`${global.emojis.warning} *Usage:* Reply to a user or tag them to block.`);

        // Prevent blocking yourself
        if (user.includes(conn.user.id.split(':')[0])) return m.reply(`${global.emojis.warning} You cannot block yourself.`);

        try {
            await conn.updateBlockStatus(user, 'block');
            await m.reply(`${global.emojis.success} *Blocked* @${user.split('@')[0]}`, null, { mentions: [user] });
        } catch (e) {
            console.error(e);
            m.reply(`${global.emojis.error} Failed to block user.`);
        }
    }
});