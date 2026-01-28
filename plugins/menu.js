import { addCommand, commands } from '../lib/plugins.js';
import { runtime } from '../lib/utils.js';

addCommand({
    pattern: 'menu',
    alias: ['help', 'h'],
    desc: 'Show all available commands',
    handler: async (m, { conn }) => {
        try {
            const totalCmds = Object.keys(commands).length;
            const uptime = runtime(process.uptime());

            let menuText = `🔮 *${global.botName} COMMAND CENTER* 🔮\n\n`;
            menuText += `👤 *User:* @${m.sender.split('@')[0]}\n`;
            menuText += `⏳ *Uptime:* ${uptime}\n`;
            menuText += `📂 *Total Commands:* ${totalCmds}\n`;
            menuText += `───────────────────\n\n`;

            // Sort commands alphabetically
            const sortedCmds = Object.keys(commands).sort();

            menuText += `✨ *AVAILABLE COMMANDS* ✨\n`;
            sortedCmds.forEach((cmd, index) => {
                const desc = commands[cmd].desc || 'No description';
                menuText += `*${index + 1}.* ${global.prefix}${cmd}\n   _↳ ${desc}_\n`;
            });

            menuText += `\n───────────────────\n`;
            menuText += `💡 *Tip:* Use ${global.prefix}command to run any tool!`;

            await conn.sendMessage(m.chat, {
                text: menuText,
                mentions: [m.sender],
                contextInfo: {
                    externalAdReply: {
                        title: global.botName,
                        body: global.author,
                        thumbnailUrl: "https://i.imgur.com/6cO45Xw.jpeg", // Your bot logo
                        sourceUrl: "https://github.com/MidknightMantra/Mantra",
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: m });

        } catch (e) {
            console.error(e);
            m.reply(`${global.emojis.error} Failed to generate menu.`);
        }
    }
});