import { addCommand } from '../lib/plugins.js';
import { getDB, updateDB } from '../lib/database.js';

// Helper to get/set Anti-Delete status from our existing DB
const getADStatus = (jid) => {
    const db = getDB();
    return db.groups[jid]?.antidelete || false;
};

const setADStatus = (jid, status) => {
    const db = getDB();
    if (!db.groups[jid]) db.groups[jid] = {};
    db.groups[jid].antidelete = status;
    updateDB(db);
};

addCommand({
    pattern: 'antidelete',
    alias: ['ad', 'antidel'],
    desc: 'Toggle Anti-Delete for this chat',
    category: 'group',
    handler: async (m, { args, isGroup, isOwner }) => {
        const chatId = m.chat;
        const option = (args[0] || '').toLowerCase();

        if (option === 'on') {
            setADStatus(chatId, true);
            await m.reply('✅ *Anti-Delete enabled* for this chat.');
        } else if (option === 'off') {
            setADStatus(chatId, false);
            await m.reply('✅ *Anti-Delete disabled* for this chat.');
        } else {
            const status = getADStatus(chatId) ? '✅ Enabled' : '❌ Disabled';
            await m.reply(
                `🔮 *Mantra Anti-Delete*\n\n` +
                `Status: ${status}\n\n` +
                `Usage:\n` +
                `${global.prefix}antidelete on\n` +
                `${global.prefix}antidelete off`
            );
        }
    }
});