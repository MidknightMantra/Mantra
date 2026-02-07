import { addCommand } from '../lib/plugins.js';
import { log } from '../src/utils/logger.js';
import { react, withReaction } from '../src/utils/messaging.js';
import {
    setGroupSetting,
    getGroupSetting,
    getBadWords,
    addBadWord,
    removeBadWord,
    clearBadWords,
    initializeDefaultBadWords,
    DEFAULT_BAD_WORDS
} from '../lib/database.js';

/**
 * UTILITY: Parse protection mode
 */
function parseMode(input) {
    if (!input) return null;
    const val = input.toLowerCase().trim();
    const map = {
        'on': 'delete',
        'off': 'false',
        'true': 'delete',
        'false': 'false',
        'delete': 'delete',
        'kick': 'kick',
        'warn': 'warn'
    };
    return map[val] || null;
}

/**
 * ANTILINK
 */
addCommand({
    pattern: 'setantilink',
    alias: ['antilink'],
    desc: 'Set antilink mode (on/warn/delete/kick/off)',
    category: 'group',
    handler: async (m, { conn, text, isGroup, isAdmin, isOwner }) => {
        if (!isGroup) return m.reply('❌ Group Only.');
        if (!isAdmin && !isOwner) return m.reply('❌ Admin/Owner Only.');

        const mode = parseMode(text);
        if (!mode) {
            const warnCount = await getGroupSetting(m.chat, 'ANTILINK_WARN_COUNT') || 3;
            return m.reply(`❌ Specify mode:\n▸ *on/delete*: Delete links\n▸ *warn*: Warn (kick after ${warnCount})\n▸ *kick*: Delete & Kick\n▸ *off*: Disable`);
        }

        await withReaction(conn, m, '🛡️', async () => {
            await setGroupSetting(m.chat, 'ANTILINK', mode);
            await m.reply(`✅ Antilink set to: *${mode.toUpperCase()}*`);
        });
    }
});

addCommand({
    pattern: 'antilinkwarn',
    alias: ['setwarncount'],
    desc: 'Set max warnings for Antilink',
    category: 'group',
    handler: async (m, { conn, text, isGroup, isAdmin, isOwner }) => {
        if (!isGroup) return m.reply('❌ Group Only.');
        if (!isAdmin && !isOwner) return m.reply('❌ Admin/Owner Only.');

        const count = parseInt(text);
        if (isNaN(count) || count < 1 || count > 10) return m.reply('❌ Provide a number between 1-10');

        await withReaction(conn, m, '🛡️', async () => {
            await setGroupSetting(m.chat, 'ANTILINK_WARN_COUNT', count);
            await m.reply(`✅ Antilink warn count set to: *${count}*`);
        });
    }
});

/**
 * ANTIBAD
 */
addCommand({
    pattern: 'setantibad',
    alias: ['antibad'],
    desc: 'Set anti-badwords mode (on/warn/delete/kick/off)',
    category: 'group',
    handler: async (m, { conn, text, isGroup, isAdmin, isOwner }) => {
        if (!isGroup) return m.reply('❌ Group Only.');
        if (!isAdmin && !isOwner) return m.reply('❌ Admin/Owner Only.');

        const mode = parseMode(text);
        if (!mode) {
            const warnCount = await getGroupSetting(m.chat, 'ANTIBAD_WARN_COUNT') || 3;
            return m.reply(`❌ Specify mode:\n▸ *on/delete*: Delete badwords\n▸ *warn*: Warn (kick after ${warnCount})\n▸ *kick*: Delete & Kick\n▸ *off*: Disable`);
        }

        await withReaction(conn, m, '🛡️', async () => {
            await setGroupSetting(m.chat, 'ANTIBAD', mode);
            await m.reply(`✅ Anti-BadWords set to: *${mode.toUpperCase()}*`);
        });
    }
});

addCommand({
    pattern: 'antibadwarn',
    alias: ['setbadwarncount'],
    desc: 'Set max warnings for Anti-BadWords',
    category: 'group',
    handler: async (m, { conn, text, isGroup, isAdmin, isOwner }) => {
        if (!isGroup) return m.reply('❌ Group Only.');
        if (!isAdmin && !isOwner) return m.reply('❌ Admin/Owner Only.');

        const count = parseInt(text);
        if (isNaN(count) || count < 1 || count > 10) return m.reply('❌ Provide a number between 1-10');

        await withReaction(conn, m, '🛡️', async () => {
            await setGroupSetting(m.chat, 'ANTIBAD_WARN_COUNT', count);
            await m.reply(`✅ Anti-BadWords warn count set to: *${count}*`);
        });
    }
});

addCommand({
    pattern: 'badwords',
    alias: ['badword'],
    desc: 'Manage bad words list (add/remove/list/default)',
    category: 'group',
    handler: async (m, { conn, args, isGroup, isAdmin, isOwner }) => {
        if (!isGroup) return m.reply('❌ Group Only.');
        if (!isAdmin && !isOwner) return m.reply('❌ Admin/Owner Only.');

        const action = args[0]?.toLowerCase();
        const word = args.slice(1).join(' ').toLowerCase();

        if (action === 'add') {
            if (!word) return m.reply('❌ Provide word.');
            await addBadWord(m.chat, word);
            await m.reply(`✅ Added *${word}* to filter.`);
        } else if (action === 'remove' || action === 'del') {
            if (!word) return m.reply('❌ Provide word.');
            const res = await removeBadWord(m.chat, word);
            await m.reply(res ? `✅ Removed *${word}*` : '❌ Word not found.');
        } else if (action === 'list') {
            const list = await getBadWords(m.chat);
            await m.reply(`🚫 *BAD WORDS (${list.length})*\n${global.divider}\n${list.join(', ') || '_None_'}`);
        } else if (action === 'default') {
            const added = await initializeDefaultBadWords(m.chat);
            await m.reply(`✅ Loaded ${added} default offensive words.`);
        } else {
            return m.reply('❌ Usage: .badwords add/remove/list/default');
        }
    }
});

/**
 * ANTI-GROUP MENTION
 */
addCommand({
    pattern: 'setantimention',
    alias: ['antimention'],
    desc: 'Set anti-group-mention mode (warn/kick/off)',
    category: 'group',
    handler: async (m, { conn, text, isGroup, isAdmin, isOwner }) => {
        if (!isGroup) return m.reply('❌ Group Only.');
        if (!isAdmin && !isOwner) return m.reply('❌ Admin/Owner Only.');

        const mode = parseMode(text);
        if (!mode) return m.reply('❌ Specify mode: warn/kick/off');

        await withReaction(conn, m, '🛡️', async () => {
            await setGroupSetting(m.chat, 'ANTI_GROUP_MENTION', mode);
            await m.reply(`✅ Anti-Group-Mention set to: *${mode.toUpperCase()}*`);
        });
    }
});

log.info('Protection plugin loaded');
