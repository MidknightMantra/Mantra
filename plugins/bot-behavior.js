import { addCommand } from '../lib/plugins.js';
import { log } from '../src/utils/logger.js';
import { react, withReaction } from '../src/utils/messaging.js';
import { getSetting, setSetting } from '../lib/database.js';

/**
 * UTILITY: Handle boolean toggle commands
 */
async function handleToggle(m, conn, key, name, input) {
    const val = input?.toLowerCase().trim();
    if (val !== 'on' && val !== 'off') return m.reply(`❌ Usage: .${m.command} on/off`);

    const status = val === 'on';
    await withReaction(conn, m, '⚙️', async () => {
        await setSetting(key, status);
        await m.reply(`✅ ${name} is now *${status ? 'ENABLED' : 'DISABLED'}*`);
    });
}

/**
 * GLOBAL BEHAVIOR COMMANDS
 */
addCommand({
    pattern: 'setautoreply', alias: ['autoreply'], desc: 'Toggle auto-reply to messages', category: 'owner', handler: async (m, { conn, text, isOwner }) => {
        if (!isOwner) return m.reply('❌ Owner Only.');
        await handleToggle(m, conn, 'AUTO_REPLY', 'Auto Reply', text);
    }
});

addCommand({
    pattern: 'setautobio', alias: ['autobio'], desc: 'Toggle automatic bio updates', category: 'owner', handler: async (m, { conn, text, isOwner }) => {
        if (!isOwner) return m.reply('❌ Owner Only.');
        await handleToggle(m, conn, 'AUTO_BIO', 'Auto Bio', text);
    }
});

addCommand({
    pattern: 'setpmpermit', alias: ['pmpermit'], desc: 'Toggle private message permit (security)', category: 'owner', handler: async (m, { conn, text, isOwner }) => {
        if (!isOwner) return m.reply('❌ Owner Only.');
        await handleToggle(m, conn, 'PM_PERMIT', 'PM Permit', text);
    }
});

/**
 * MODE COMMAND (AUTO READ/REACT SETTINGS)
 */
addCommand({
    pattern: 'setautoread',
    alias: ['readmessages'],
    desc: 'Set auto-read mode (on/all/dm/groups/commands/off)',
    category: 'owner',
    handler: async (m, { conn, text, isOwner }) => {
        if (!isOwner) return m.reply('❌ Owner Only.');
        const modes = ['on', 'all', 'dm', 'groups', 'commands', 'off'];
        const input = text?.toLowerCase().trim();
        if (!modes.includes(input)) return m.reply(`❌ Valid modes: ${modes.join(', ')}`);

        await withReaction(conn, m, '⚙️', async () => {
            await setSetting('AUTO_READ_MESSAGES', input === 'on' ? 'all' : input);
            await m.reply(`✅ Auto Read Mode set to: *${input.toUpperCase()}*`);
        });
    }
});

addCommand({
    pattern: 'setautoreact',
    alias: ['autoreact'],
    desc: 'Set auto-react mode (on/all/dm/groups/commands/off)',
    category: 'owner',
    handler: async (m, { conn, text, isOwner }) => {
        if (!isOwner) return m.reply('❌ Owner Only.');
        const modes = ['on', 'all', 'dm', 'groups', 'commands', 'off'];
        const input = text?.toLowerCase().trim();
        if (!modes.includes(input)) return m.reply(`❌ Valid modes: ${modes.join(', ')}`);

        await withReaction(conn, m, '⚙️', async () => {
            await setSetting('AUTO_REACT', input === 'on' ? 'all' : input);
            await m.reply(`✅ Auto React Mode set to: *${input.toUpperCase()}*`);
        });
    }
});

/**
 * METADATA & LINKS
 */
addCommand({
    pattern: 'setytlink',
    alias: ['ytlink'],
    desc: 'Set YouTube channel link',
    category: 'owner',
    handler: async (m, { conn, text, isOwner }) => {
        if (!isOwner || !text) return m.reply('❌ Usage: .ytlink <url>');
        await withReaction(conn, m, '⚙️', async () => {
            await setSetting('YT', text.trim());
            await m.reply('✅ YouTube link updated.');
        });
    }
});

addCommand({
    pattern: 'setnewsletterjid',
    alias: ['channeljid'],
    desc: 'Set Newsletter JID for forwarding',
    category: 'owner',
    handler: async (m, { conn, text, isOwner }) => {
        if (!isOwner || !text) return m.reply('❌ Usage: .channeljid <jid>');
        await withReaction(conn, m, '⚙️', async () => {
            await setSetting('NEWSLETTER_JID', text.trim());
            await m.reply('✅ Newsletter JID updated.');
        });
    }
});

addCommand({
    pattern: 'setpackname',
    alias: ['stickerpack'],
    desc: 'Set default sticker pack name',
    category: 'owner',
    handler: async (m, { conn, text, isOwner }) => {
        if (!isOwner || !text) return m.reply('❌ Usage: .packname <name>');
        await withReaction(conn, m, '⚙️', async () => {
            await setSetting('PACK_NAME', text.trim());
            await m.reply('✅ Sticker pack name updated.');
        });
    }
});

log.action('Bot Behavior plugin loaded', 'system');
