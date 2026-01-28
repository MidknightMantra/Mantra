import { addCommand, commands } from '../lib/plugins.js';
import { runtime } from '../lib/utils.js';

addCommand({
    pattern: 'menu',
    handler: async (m, { conn }) => {
        const { menu, user, time, ping } = global.emojis; // Destructure emojis

        let menuText = `${menu} *MANTRA SYSTEM* ${menu}\n`;
        menuText += `│\n`;
        menuText += `│ 👤 *User:* @${m.sender.split('@')[0]}\n`;
        menuText += `│ 👑 *Owner:* ${global.author}\n`;
        menuText += `│ 🔮 *Runtime:* ${runtime(process.uptime())}\n`;
        menuText += `│\n`;
        menuText += `╰───────────────────⚗️\n\n`;

        // Organize commands cleanly
        let cmdList = Object.keys(commands);
        cmdList.sort();

        menuText += `*AVAILABLE SPELLS:* \n`;

        cmdList.forEach((cmd) => {
            menuText += `➣ ${global.prefix}${cmd}\n`;
        });

        menuText += `\n${global.emojis.waiting} _Keep the Mantra Alive._`;

        await conn.sendMessage(m.chat, {
            text: menuText,
            mentions: [m.sender]
        }, { quoted: m });
    }
});