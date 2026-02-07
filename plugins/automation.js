import { addCommand } from '../lib/plugins.js';
import { log } from '../src/utils/logger.js';
import { react, withReaction } from '../src/utils/messaging.js';
import { setSetting, getSetting } from '../lib/database.js';

/**
 * UTILITY: Handle boolean toggles
 */
async function setToggle(m, conn, key, name, input, options = ['on', 'off']) {
    const val = input?.toLowerCase().trim();
    if (!options.includes(val)) return m.reply(`❌ Specify: ${options.join('/')}`);

    const boolVal = val === 'on' ? 'true' : (val === 'off' ? 'false' : val);
    await withReaction(conn, m, '⚙️', async () => {
        await setSetting(key, boolVal);
        await m.reply(`✅ ${name} set to: *${val.toUpperCase()}*`);
    });
}

/**
 * ANTIDELETE
 */
addCommand({
    pattern: 'setantidelete',
    alias: ['antidelete'],
    desc: 'Set antidelete mode (inchat/indm/off)',
    category: 'owner',
    handler: async (m, { conn, text, isOwner }) => {
        if (!isOwner) return m.reply('❌ Owner Only.');
        await setToggle(m, conn, 'ANTIDELETE', 'Antidelete', text, ['inchat', 'indm', 'off', 'on']);
    }
});

/**
 * ANTICALL
 */
addCommand({
    pattern: 'setanticall',
    alias: ['anticall', 'blockcall'],
    desc: 'Set anticall mode (block/decline/off)',
    category: 'owner',
    handler: async (m, { conn, text, isOwner }) => {
        if (!isOwner) return m.reply('❌ Owner Only.');
        await setToggle(m, conn, 'ANTICALL', 'Anticall', text, ['block', 'decline', 'off', 'on']);
    }
});

/**
 * CHATBOT AI
 */
addCommand({
    pattern: 'setchatbot',
    alias: ['ai', 'chatbot'],
    desc: 'Toggle Chatbot AI (on/off/audio)',
    category: 'owner',
    handler: async (m, { conn, text, isOwner }) => {
        if (!isOwner) return m.reply('❌ Owner Only.');
        await setToggle(m, conn, 'CHATBOT', 'Chatbot', text, ['on', 'off', 'audio']);
    }
});

addCommand({
    pattern: 'setchatbotmode',
    alias: ['aimode'],
    desc: 'Set chatbot scope (inbox/groups/all)',
    category: 'owner',
    handler: async (m, { conn, text, isOwner }) => {
        if (!isOwner) return m.reply('❌ Owner Only.');
        const modes = ['inbox', 'groups', 'allchats', 'all'];
        if (!modes.includes(text?.toLowerCase())) return m.reply('❌ Specify: inbox/groups/all');
        await withReaction(conn, m, '⚙️', async () => {
            await setSetting('CHATBOT_MODE', text.toLowerCase());
            await m.reply(`✅ Chatbot Mode: *${text.toUpperCase()}*`);
        });
    }
});

/**
 * STARTING MESSAGE
 */
addCommand({
    pattern: 'setstartmsg',
    alias: ['startmsg'],
    desc: 'Toggle starting message on boot',
    category: 'owner',
    handler: async (m, { conn, text, isOwner }) => {
        if (!isOwner) return m.reply('❌ Owner Only.');
        await setToggle(m, conn, 'STARTING_MESSAGE', 'Starting Message', text);
    }
});

log.info('Automation plugin loaded');
