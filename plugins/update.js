import { addCommand } from '../lib/plugins.js';
import { exec } from 'child_process';

addCommand({
    pattern: 'update',
    alias: ['gitpull', 'upgrade'],
    category: 'owner',
    handler: async (m, { conn, isOwner }) => {
        if (!isOwner) return m.reply(`${global.emojis.error} Owner only.`);

        try {
            // 1. Initial Reaction
            await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });

            // 2. Execute git pull
            exec('git pull', (err, stdout, stderr) => {
                if (err) {
                    conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
                    return m.reply(`${global.emojis.error} *Update Failed:*\n\n${stderr}`);
                }

                if (stdout.includes('Already up to date')) {
                    conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });
                    return m.reply(`${global.emojis.info} *Mantra is already latest version.*`);
                }

                m.reply(`${global.emojis.success} *Updated Successfully!*\n${global.divider}\n${stdout}\n\n*Restarting...*`);
                conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

                // Restart after update
                setTimeout(() => {
                    process.exit(0);
                }, 3000);
            });

        } catch (e) {
            console.error('Update Error:', e);
            await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
            m.reply(`${global.emojis.error} ⏤ Error executing git command.`);
        }
    }
});