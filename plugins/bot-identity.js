import { addCommand } from '../lib/plugins.js';
import { log } from '../src/utils/logger.js';
import { react, withReaction } from '../src/utils/messaging.js';
import { setSetting, getSetting } from '../lib/database.js';

/**
 * UTILITY: Handle metadata setting with consistency check
 */
async function setMetadata(m, conn, key, name, value) {
    if (!value) return m.reply(`❌ Please provide a ${name}!\nExample: .set${name.toLowerCase().replace(' ', '')} MyValue`);

    const current = await getSetting(key);
    if (current === value.trim()) {
        return m.reply(`⚠️ ${name} is already set to: *${value.trim()}*`);
    }

    await withReaction(conn, m, '⚙️', async () => {
        await setSetting(key, value.trim());
        await m.reply(`✅ ${name} updated to: *${value.trim()}*`);
    });
}

/**
 * BOT IDENTITY COMMANDS
 */
addCommand({
    pattern: 'setprefix', alias: ['prefix', 'changeprefix'], desc: 'Set bot command prefix', category: 'owner', handler: async (m, { conn, text, isOwner }) => {
        if (!isOwner) return m.reply('❌ Owner Only.');
        await setMetadata(m, conn, 'PREFIX', 'Prefix', text);
    }
});

addCommand({
    pattern: 'setbotname', alias: ['botname', 'changename'], desc: 'Set bot display name', category: 'owner', handler: async (m, { conn, text, isOwner }) => {
        if (!isOwner) return m.reply('❌ Owner Only.');
        await setMetadata(m, conn, 'BOT_NAME', 'Bot Name', text);
    }
});

addCommand({
    pattern: 'setownername', alias: ['ownername', 'myname'], desc: 'Set owner display name', category: 'owner', handler: async (m, { conn, text, isOwner }) => {
        if (!isOwner) return m.reply('❌ Owner Only.');
        await setMetadata(m, conn, 'OWNER_NAME', 'Owner Name', text);
    }
});

addCommand({
    pattern: 'setownernumber', alias: ['ownernumber', 'mynumber'], desc: 'Set owner phone number', category: 'owner', handler: async (m, { conn, text, isOwner }) => {
        if (!isOwner) return m.reply('❌ Owner Only.');
        const num = text?.replace(/\D/g, '');
        await setMetadata(m, conn, 'OWNER_NUMBER', 'Owner Number', num);
    }
});

addCommand({
    pattern: 'setfooter', alias: ['footer', 'botfooter'], desc: 'Set message footer text', category: 'owner', handler: async (m, { conn, text, isOwner }) => {
        if (!isOwner) return m.reply('❌ Owner Only.');
        await setMetadata(m, conn, 'FOOTER', 'Footer', text);
    }
});

addCommand({
    pattern: 'setcaption', alias: ['caption', 'botcaption'], desc: 'Set default caption for media', category: 'owner', handler: async (m, { conn, text, isOwner }) => {
        if (!isOwner) return m.reply('❌ Owner Only.');
        await setMetadata(m, conn, 'CAPTION', 'Caption', text);
    }
});

addCommand({
    pattern: 'setbotpic', alias: ['botimage', 'botpic'], desc: 'Set bot profile/thumbnail image URL', category: 'owner', handler: async (m, { conn, text, isOwner }) => {
        if (!isOwner) return m.reply('❌ Owner Only.');
        await setMetadata(m, conn, 'BOT_PIC', 'Bot Picture URL', text);
    }
});

addCommand({
    pattern: 'setmode',
    alias: ['mode'],
    desc: 'Set bot mode (public/private)',
    category: 'owner',
    handler: async (m, { conn, text, isOwner }) => {
        if (!isOwner) return m.reply('❌ Owner Only.');
        const mode = text?.toLowerCase().trim();
        if (!['public', 'private'].includes(mode)) return m.reply('❌ Please specify: public or private');
        await setMetadata(m, conn, 'MODE', 'Bot Mode', mode);
    }
});

addCommand({
    pattern: 'settimezone', alias: ['tz', 'timezone'], desc: 'Set bot timezone', category: 'owner', handler: async (m, { conn, text, isOwner }) => {
        if (!isOwner) return m.reply('❌ Owner Only.');
        await setMetadata(m, conn, 'TIME_ZONE', 'Timezone', text);
    }
});

/**
 * PRESENCE MANAGEMENT
 */
addCommand({
    pattern: 'setpresence',
    alias: ['dmpresence', 'gcpresence'],
    desc: 'Set bot presence (online/offline/typing/recording)',
    category: 'owner',
    handler: async (m, { conn, text, isOwner }) => {
        if (!isOwner) return m.reply('❌ Owner Only.');
        const valid = ['online', 'offline', 'typing', 'recording'];
        const input = text?.toLowerCase().trim();
        if (!valid.includes(input)) return m.reply(`❌ Valid modes: ${valid.join(', ')}`);

        await withReaction(conn, m, '⚙️', async () => {
            const key = m.command.includes('gc') ? 'GC_PRESENCE' : (m.command.includes('dm') ? 'DM_PRESENCE' : 'PRESENCE');
            await setSetting(key, input);
            await m.reply(`✅ ${key.replace('_', ' ')} set to: *${input.toUpperCase()}*`);
        });
    }
});

log.action('Bot Identity plugin loaded', 'system');
