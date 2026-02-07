import { addCommand } from '../lib/plugins.js';
import { log } from '../src/utils/logger.js';
import { react, withReaction } from '../src/utils/messaging.js';
import { getSetting, setSetting } from '../lib/database.js';

/**
 * AUTO LIKE STATUS
 */
addCommand({
    pattern: 'setautolikestatus',
    alias: ['autolike', 'likestatus'],
    desc: 'Toggle automatic status liking/reacting',
    category: 'owner',
    handler: async (m, { conn, text, isOwner }) => {
        if (!isOwner) return m.reply('❌ Owner Only.');
        const val = text?.toLowerCase().trim();
        if (val !== 'on' && val !== 'off') return m.reply('❌ Usage: .autolike on/off');

        const status = val === 'on';
        await withReaction(conn, m, '⚙️', async () => {
            await setSetting('AUTO_LIKE_STATUS', status);
            await m.reply(`✅ Auto Status Like is now *${status ? 'ENABLED' : 'DISABLED'}*`);
        });
    }
});

/**
 * AUTO READ STATUS
 */
addCommand({
    pattern: 'setautoreadstatus',
    alias: ['autoreadstatus', 'viewstatus'],
    desc: 'Toggle automatic status viewing',
    category: 'owner',
    handler: async (m, { conn, text, isOwner }) => {
        if (!isOwner) return m.reply('❌ Owner Only.');
        const val = text?.toLowerCase().trim();
        if (val !== 'on' && val !== 'off') return m.reply('❌ Usage: .viewstatus on/off');

        const status = val === 'on';
        await withReaction(conn, m, '⚙️', async () => {
            await setSetting('AUTO_READ_STATUS', status);
            await m.reply(`✅ Auto Status Reading is now *${status ? 'ENABLED' : 'DISABLED'}*`);
        });
    }
});

/**
 * STATUS EMOJIS
 */
addCommand({
    pattern: 'setstatusemojis',
    alias: ['likeemojis', 'statusemojis'],
    desc: 'Set emojis used for status reactions (comma separated)',
    category: 'owner',
    handler: async (m, { conn, text, isOwner }) => {
        if (!isOwner) return m.reply('❌ Owner Only.');
        if (!text) return m.reply('❌ Usage: .setstatusemojis ❤️,🔥,🙌');

        await withReaction(conn, m, '⚙️', async () => {
            await setSetting('STATUS_LIKE_EMOJIS', text.trim());
            await m.reply(`✅ Status reaction emojis set to: ${text.trim()}`);
        });
    }
});

/**
 * STATUS REPLY TEXT
 */
addCommand({
    pattern: 'setstatusreplytext',
    alias: ['statusreply'],
    desc: 'Set automatic reply text for statuses',
    category: 'owner',
    handler: async (m, { conn, text, isOwner }) => {
        if (!isOwner) return m.reply('❌ Owner Only.');
        if (!text) return m.reply('❌ Usage: .statusreply Nice status!');

        await withReaction(conn, m, '⚙️', async () => {
            await setSetting('STATUS_REPLY_TEXT', text.trim());
            await m.reply(`✅ Status auto-reply text updated.`);
        });
    }
});

log.info('Status Bot plugin loaded');
