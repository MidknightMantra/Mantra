import { addCommand } from '../lib/plugins.js';
import { isWelcomeOn, isAntilinkOn } from '../lib/database.js';

addCommand({
    pattern: 'groupinfo',
    alias: ['settings', 'ginfo'],
    desc: 'Show group settings and info dashboard',
    handler: async (m, { conn, isGroup, groupMetadata }) => {
        if (!isGroup) return m.reply(`${global.emojis.error} Group command only.`);

        try {
            const welcomeStatus = isWelcomeOn(m.chat) ? '✅ Enabled' : '❌ Disabled';
            const antilinkStatus = isAntilinkOn(m.chat) ? '✅ Enabled' : '❌ Disabled';

            // Get Admin count
            const admins = groupMetadata.participants.filter(p => p.admin).length;

            let msg = `🔮 *MANTRA GROUP DASHBOARD* 🔮\n\n`;
            msg += `📝 *Name:* ${groupMetadata.subject}\n`;
            msg += `🆔 *JID:* ${m.chat}\n`;
            msg += `👥 *Members:* ${groupMetadata.participants.length}\n`;
            msg += `👮 *Admins:* ${admins}\n`;
            msg += `📅 *Created:* ${new Date(groupMetadata.creation * 1000).toDateString()}\n`;
            msg += `\n───────────────────\n\n`;
            msg += `🛡️ *SECURITY SETTINGS*\n`;
            msg += `👋 *Welcome:* ${welcomeStatus}\n`;
            msg += `🔗 *Anti-Link:* ${antilinkStatus}\n`;
            msg += `♻️ *Anti-Delete:* ✅ Always On\n`;
            msg += `🔞 *Anti-ViewOnce:* ✅ Always On\n`;
            msg += `\n───────────────────\n`;
            msg += `💡 *Tip:* Use ${global.prefix}welcome or ${global.prefix}antilink to toggle these!`;

            // Try to send with group profile picture
            let pp = 'https://i.imgur.com/6cO45Xw.jpeg';
            try {
                pp = await conn.profilePictureUrl(m.chat, 'image');
            } catch { }

            await conn.sendMessage(m.chat, {
                image: { url: pp },
                caption: msg
            }, { quoted: m });

        } catch (e) {
            console.error(e);
            m.reply(`${global.emojis.error} Failed to fetch group info.`);
        }
    }
});