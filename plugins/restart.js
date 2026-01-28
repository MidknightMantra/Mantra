import { addCommand } from '../lib/plugins.js';

addCommand({
    pattern: 'restart',
    alias: ['reboot'],
    desc: 'Restart the bot',
    handler: async (m, { conn, isOwner }) => {
        if (!isOwner) return m.reply(`${global.emojis.error} Owner only.`);

        try {
            await m.reply(`${global.emojis.waiting} *Mantra is rebooting...*`);

            // Allow time for the message to send
            setTimeout(() => {
                process.exit(0); // Exits the process; Docker/Railway will auto-restart it
            }, 2000);

        } catch (e) {
            m.reply(`${global.emojis.error} Failed to restart.`);
        }
    }
});