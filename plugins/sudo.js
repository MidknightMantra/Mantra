import { addCommand } from '../lib/plugins.js';
import { setSudoMode, isSudoMode } from '../lib/database.js';
import { log } from '../src/utils/logger.js';

addCommand({
    pattern: 'sudo',
    alias: ['selfcmd', 'ownercmd'],
    category: 'owner',
    handler: async (m, { conn, args, isOwner }) => {
        if (!isOwner) return m.reply(`${global.emojis.error} Owner only.`);

        const option = (args[0] || '').toLowerCase();

        if (option === 'on') {
            setSudoMode(true);
            log.action('Sudo mode enabled', 'owner', { owner: m.sender });
            await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });
            await m.reply('🔮 *Sudo Mode: ENABLED*\n\nYou can now use commands on your own messages.');
        } else if (option === 'off') {
            setSudoMode(false);
            log.action('Sudo mode disabled', 'owner', { owner: m.sender });
            await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });
            await m.reply('🔮 *Sudo Mode: DISABLED*\n\nBot will only respond to others.');
        } else {
            const status = isSudoMode() ? '✅ Enabled' : '❌ Disabled';
            await m.reply(
                `🔮 *MANTRA SUDO MODE*\n${global.divider}\n` +
                `Status: ${status}\n\n` +
                `*What is Sudo Mode?*\n` +
                `When enabled, you (the owner) can use bot commands on your own messages.\n\n` +
                `*Usage:*\n` +
                `${global.prefix}sudo on - Enable\n` +
                `${global.prefix}sudo off - Disable`
            );
        }
    }
});
