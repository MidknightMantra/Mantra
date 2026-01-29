import { addCommand } from '../lib/plugins.js';

addCommand({
    pattern: 'restart',
    alias: ['reboot'],
    category: 'owner',
    handler: async (m, { conn, isOwner }) => {
        if (!isOwner) return m.reply(`${global.emojis.error} Owner only.`);

        try {
            // 1. Initial Reaction
            await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });

            // 2. Send Restart Message
            await m.reply(`${global.emojis.waiting} *Mantra is rebooting...*`);

            // 3. Allow time for the message to send
            setTimeout(() => {
                process.exit(0); // Exits the process; Docker/Railway will auto-restart it
            }, 2000);

        } catch (e) {
            console.error('Restart Error:', e);
            await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
            m.reply(`${global.emojis.error} ⏤ Failed to restart.`);
        }
    }
});