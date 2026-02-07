import { addCommand } from '../lib/plugins.js';
import { setAntilink, isAntilinkOn } from '../lib/database.js';
import { log } from '../src/utils/logger.js';
import { UI } from '../src/utils/design.js';

addCommand({
    pattern: 'antilink',
    alias: ['antigrouplink'],
    desc: 'Toggle Anti-Link protection',
    handler: async (m, { args, isGroup, isOwner, groupMetadata, conn }) => {
        if (!isGroup) return m.reply(UI.error('Group Only', 'This command is for groups only', 'Use this in a group chat'));

        try {
            const groupAdmins = groupMetadata.participants.filter(p => p.admin).map(p => p.id);
            if (!groupAdmins.includes(m.sender) && !isOwner) {
                return m.reply(UI.error('Admin Only', 'Only group admins can use this', 'Ask an admin to enable/disable antilink'));
            }

            const option = args[0]?.toLowerCase();

            if (option === 'on') {
                await setAntilink(m.chat, true);
                log.action('Antilink enabled', 'security', { group: m.chat, admin: m.sender });
                m.reply(`${global.emojis.success} *Anti-Link is now ACTIVE.*\n\nUnauthorized group links will result in:\n• Warning message\n• Auto-delete of link\n• Kick (if not admin)`);
            } else if (option === 'off') {
                await setAntilink(m.chat, false);
                log.action('Antilink disabled', 'security', { group: m.chat, admin: m.sender });
                m.reply(`${global.emojis.success} *Anti-Link is now DISABLED.*\n\nGroup links are now allowed.`);
            } else {
                const status = await isAntilinkOn(m.chat) ? '🟢 ON' : '🔴 OFF';
                m.reply(`${global.emojis.info} *Anti-Link Status: ${status}*\n\n*Usage:*\n• \`${global.prefix}antilink on\` - Enable protection\n• \`${global.prefix}antilink off\` - Disable protection\n\n*What it does:*\nRemoves WhatsApp group invite links and kicks non-admins who post them.`);
            }
        } catch (error) {
            log.error('Antilink toggle failed', error, { command: 'antilink', group: m.chat });
            m.reply(UI.error('Operation Failed', error.message || 'Failed to toggle antilink', 'Check bot permissions\\nEnsure bot is admin\\nTry again'));
        }
    }
});