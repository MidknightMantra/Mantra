import { addCommand } from '../lib/plugins.js';
import { UI } from '../src/utils/design.js';
import { log } from '../src/utils/logger.js';
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
            log.error('Update command failed', e, { command: 'update', user: m.sender });
            await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
            m.reply(UI.error('Update Failed', e.message || 'Error executing git command', 'Ensure git is installed\nCheck repository status\nVerify network connection'));
        }
    }
});