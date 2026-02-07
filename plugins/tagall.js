import { addCommand } from '../lib/plugins.js';
import { log } from '../src/utils/logger.js';

addCommand({
    pattern: 'tagall',
    alias: ['everyone', 'announce'],
    desc: 'Tag all group members',
    handler: async (m, { conn, isGroup, isOwner, groupMetadata, text }) => {
        if (!isGroup) return m.reply(`${global.emojis.error} Group command only.`);

        const groupAdmins = groupMetadata.participants.filter(p => p.admin).map(p => p.id);
        const isUserAdmin = groupAdmins.includes(m.sender);

        if (!isUserAdmin && !isOwner) return m.reply(`${global.emojis.warning} Admins only.`);

        let members = groupMetadata.participants.map(p => p.id);
        let message = `*🔮 EVERYONE HEAR THIS 🔮*\n\n📄 *Msg:* ${text || 'Wake up!'}\n\n`;

        for (let mem of members) {
            message += `➣ @${mem.split('@')[0]}\n`;
        }

        log.action('TagAll used', 'moderation', { group: m.chat, taggedBy: m.sender, count: members.length });

        await conn.sendMessage(m.chat, {
            text: message,
            mentions: members
        }, { quoted: m });
    }
});