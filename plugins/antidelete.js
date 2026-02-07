import { addCommand } from '../lib/plugins.js';
import { UI } from '../src/utils/design.js';
import { log } from '../src/utils/logger.js';
import { getDB, updateDB } from '../lib/database.js';

// Helper to get/set Anti-Delete status from our existing DB
const getADStatus = (jid) => {
    const db = getDB();
    return db.groups?.[jid]?.antidelete || false;
};

const setADStatus = (jid, status) => {
    const db = getDB();
    if (!db.groups) db.groups = {};
    if (!db.groups[jid]) db.groups[jid] = {};
    db.groups[jid].antidelete = status;
    updateDB(db);
};

addCommand({
    pattern: 'antidelete',
    alias: ['ad', 'antidel'],
    desc: 'Toggle Anti-Delete for this chat. Prevents deleted messages from being lost by resending them.',
    category: 'group',
    handler: async (m, { conn, args, isGroup, isOwner, isAdmin }) => {
        if (!isGroup) {
            return m.reply(`${global.emojis.warning} This command is only for group chats.`);
        }

        const chatId = m.chat;
        const option = (args[0] || '').toLowerCase();

        // Check permissions: Allow only group admins or bot owner
        if (option === 'on' || option === 'off') {
            if (!isAdmin && !isOwner) {
                return m.reply(`${global.emojis.error} Only group admins or the bot owner can toggle Anti-Delete.`);
            }
        }

        try {
            // Initial Reaction
            await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });

            if (option === 'on') {
                setADStatus(chatId, true);
                await m.reply(`${global.emojis.success} *Anti-Delete enabled* for this chat.\nDeleted messages will now be resent with a note.`);
            } else if (option === 'off') {
                setADStatus(chatId, false);
                await m.reply(`${global.emojis.success} *Anti-Delete disabled* for this chat.`);
            } else {
                const status = getADStatus(chatId) ? '✅ Enabled' : '❌ Disabled';
                let msg = `🔮 *Mantra Anti-Delete*\n${global.divider}\n`;
                msg += `✦ *Status:* ${status}\n\n`;
                msg += `✦ *Description:* When enabled, deleted messages in this group will be automatically resent by the bot with a "Deleted Message" indicator.\n\n`;
                msg += `✦ *Usage (Admins only):*\n`;
                msg += `- ${global.prefix}antidelete on\n`;
                msg += `- ${global.prefix}antidelete off\n`;
                msg += `\n${global.divider}`;
                await m.reply(msg);
            }

            // Success Reaction
            await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });
        } catch (e) {
            log.error('Anti-delete toggle failed', e, { command: 'antidelete', chat: m.chat, user: m.sender });
            await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
            m.reply(UI.error('Anti-Delete Error', e.message || 'Command failed', 'Check group permissions\nEnsure bot has admin rights'));
        }
    }
});
