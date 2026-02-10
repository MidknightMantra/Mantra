const axios = require('axios');

module.exports = {
    name: 'menu',
    aliases: ['help', 'commands'],
    description: 'Show available bot commands',

    async execute(sock, m) {
        const prefix = '.';

        const menuText = `
*Mantra WhatsApp Bot*

*Available Commands:*
• ${prefix}alive
• ${prefix}poll  
• ${prefix}couplepp
• ${prefix}creator
• ${prefix}ping
• ${prefix}sticker
• ${prefix}tagall
• ${prefix}tagme
• ${prefix}uptime
• ${prefix}tts
• ${prefix}viewonce
• ${prefix}repo - Get bot repository info

*Group Management:*
• ${prefix}groupinfo - View group info
• ${prefix}group - Manage group settings
• ${prefix}members - List group members
• ${prefix}grouplink - Get group link
• ${prefix}announce - Make announcement

Powered by Mantra
        `.trim();

        const imgUrl = 'https://files.catbox.moe/rg0pnn.jpg';
        const author = 'MidknightMantra';
        const botname = 'Mantra ᴍᴜʟᴛɪᴅᴇᴠɪᴄᴇ';
        const sourceUrl = 'https://abztech.my.id/';

        try {
            const thumbnailBuffer = (await axios.get(imgUrl, { responseType: 'arraybuffer' })).data;

            await m.send(menuText, {
                contextInfo: {
                    forwardingScore: 999,
                    isForwarded: true,
                    externalAdReply: {
                        title: author,
                        body: botname,
                        thumbnail: thumbnailBuffer,
                        mediaType: 1,
                        renderLargerThumbnail: true,
                        sourceUrl
                    }
                }
            });
        } catch (err) {
            console.error('❌ Error sending menu:', err);
            await m.reply('⚠️ Failed to send menu.');
        }
    }
};
