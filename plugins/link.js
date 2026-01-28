import { addCommand } from '../lib/plugins.js';

addCommand({
    pattern: 'link',
    alias: ['invitelink', 'grouplink'],
    desc: 'Get group invite link',
    handler: async (m, { conn, isGroup, groupMetadata }) => {
        if (!isGroup) return m.reply(`${global.emojis.error} Group only.`);

        // Bot needs admin to get link
        try {
            const code = await conn.groupInviteCode(m.chat);
            const link = `https://chat.whatsapp.com/${code}`;

            await conn.sendMessage(m.chat, {
                text: `🔮 *Group Link*\n\n👥 *Name:* ${groupMetadata.subject}\n🔗 *Link:* ${link}`,
                contextInfo: {
                    externalAdReply: {
                        title: groupMetadata.subject,
                        body: 'Join Group',
                        thumbnailUrl: null, // You can fetch group icon if you want
                        sourceUrl: link,
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: m });

        } catch (e) {
            m.reply(`${global.emojis.error} I need to be Admin to fetch the link.`);
        }
    }
});