import { addCommand } from '../lib/plugins.js';
import { setAntilink, isAntilinkOn } from '../lib/database.js';

addCommand({
    pattern: 'antilink',
    alias: ['antigrouplink'],
    desc: 'Toggle Anti-Link protection',
    handler: async (m, { args, isGroup, isOwner, groupMetadata }) => {
        if (!isGroup) return m.reply(`${global.emojis.error} Group only.`);

        const groupAdmins = groupMetadata.participants.filter(p => p.admin).map(p => p.id);
        if (!groupAdmins.includes(m.sender) && !isOwner) return m.reply(`${global.emojis.warning} Admins only.`);

        const option = args[0]?.toLowerCase();

        if (option === 'on') {
            setAntilink(m.chat, true);
            m.reply(`${global.emojis.success} *Anti-Link is now ACTIVE.* Unauthorized links will result in a kick.`);
        } else if (option === 'off') {
            setAntilink(m.chat, false);
            m.reply(`${global.emojis.success} *Anti-Link is now DISABLED.*`);
        } else {
            const status = isAntilinkOn(m.chat) ? 'ON' : 'OFF';
            m.reply(`${global.emojis.info} *Anti-Link Status: ${status}*\n\nUsage:\n*${global.prefix}antilink on*\n*${global.prefix}antilink off*`);
        }
    }
});