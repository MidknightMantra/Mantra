import { addCommand } from '../lib/plugins.js';
import { exec } from 'child_process';

addCommand({
    pattern: 'update',
    alias: ['gitpull', 'upgrade'],
    desc: 'Update bot from GitHub',
    handler: async (m, { conn, isOwner }) => {
        if (!isOwner) return m.reply(`${global.emojis.error} Owner only.`);

        try {
            await m.reply(`${global.emojis.waiting} *Checking for updates...*`);

            exec('git pull', (err, stdout, stderr) => {
                if (err) {
                    return m.reply(`${global.emojis.error} *Update Failed:*\n\n${stderr}`);
                }

                if (stdout.includes('Already up to date')) {
                    return m.reply(`${global.emojis.info} *Mantra is already latest version.*`);
                }

                m.reply(`${global.emojis.success} *Updated Successfully!*\n\n${stdout}\n\n*Restarting...*`);

                // Restart after update
                setTimeout(() => {
                    process.exit(0);
                }, 3000);
            });

        } catch (e) {
            console.error(e);
            m.reply(`${global.emojis.error} Error executing git command.`);
        }
    }
});