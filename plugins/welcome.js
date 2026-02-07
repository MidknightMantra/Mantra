import { addCommand } from '../lib/plugins.js';
import { setWelcome, isWelcomeOn } from '../lib/database.js';
import { log } from '../src/utils/logger.js';

addCommand({
    pattern: 'welcome',
    desc: 'Toggle Welcome/Goodbye messages',
    handler: async (m, { args, isGroup, isOwner, groupMetadata }) => {
        if (!isGroup) return m.reply(`${global.emojis.error} Group only.`);

        // Permission Check: Admins or Owner only
        const groupAdmins = groupMetadata.participants.filter(p => p.admin).map(p => p.id);
        if (!groupAdmins.includes(m.sender) && !isOwner) return m.reply(`${global.emojis.warning} Admins only.`);

        const option = args[0]?.toLowerCase();

        if (option === 'on') {
            setWelcome(m.chat, true);
            log.action('Welcome enabled', 'config', { group: m.chat, enabledBy: m.sender });
            m.reply(`${global.emojis.success} *Welcome messages ENABLED for this group.*`);
        } else if (option === 'off') {
            setWelcome(m.chat, false);
            log.action('Welcome disabled', 'config', { group: m.chat, disabledBy: m.sender });
            m.reply(`${global.emojis.success} *Welcome messages DISABLED.*`);
        } else {
            // Check current status
            const status = isWelcomeOn(m.chat) ? 'ON' : 'OFF';
            m.reply(`${global.emojis.info} *Welcome System is: ${status}*\n\nUsage:\n*${global.prefix}welcome on*\n*${global.prefix}welcome off*`);
        }
    }
});