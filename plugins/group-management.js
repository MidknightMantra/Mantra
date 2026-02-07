import { addCommand } from '../lib/plugins.js';
import { log } from '../src/utils/logger.js';
import { react, withReaction } from '../src/utils/messaging.js';
import { getGroupSetting, setGroupSetting, getAllGroupSettings, resetAllGroupSettings } from '../lib/database.js';
import { Jimp } from 'jimp';
import pkg from 'gifted-baileys';
const { S_WHATSAPP_NET } = pkg;

/**
 * UTILITY: Parse setting input (on/off/warn/kick/delete)
 */
function parseAction(input) {
    if (!input) return null;
    const val = input.toLowerCase().trim();
    const valid = ['on', 'off', 'warn', 'kick', 'delete', 'true', 'false'];
    if (!valid.includes(val)) return null;

    if (val === 'on' || val === 'true') return true;
    if (val === 'off' || val === 'false') return false;
    return val;
}

/**
 * GROUP SETTINGS DASHBOARD
 */
addCommand({
    pattern: 'groupsettings',
    alias: ['gcsettings', 'gsettings'],
    desc: 'View all settings for the current group',
    category: 'group',
    handler: async (m, { conn, isGroup, isAdmin, isOwner }) => {
        if (!isGroup) return m.reply('❌ Group Only.');
        if (!isAdmin && !isOwner) return m.reply('❌ Admin/Owner Only.');

        await withReaction(conn, m, '⚙️', async () => {
            const s = await getAllGroupSettings(m.chat);

            const format = (v) => v === true || v === 'on' ? '✅ ON' : (v === false || v === 'off' ? '❌ OFF' : `⚠️ ${v.toUpperCase()}`);

            let msg = `╭━━━━━━━━━━━━━━━━╮\n`;
            msg += `│ ⚙️ *GROUP SETTINGS*\n`;
            msg += `├━━━━━━━━━━━━━━━━┤\n`;
            msg += `│ 👋 *Welcome:* ${format(s.welcome)}\n`;
            msg += `│ 👋 *Goodbye:* ${format(s.goodbye)}\n`;
            msg += `│ 📢 *Events:* ${format(s.groupEvents)}\n`;
            msg += `│ 🛡️ *Antilink:* ${format(s.antilink)}\n`;
            msg += `│ 🚫 *Antibad:* ${format(s.antibad)}\n`;
            msg += `│ 👤 *Anti-Mention:* ${format(s.antiGroupMention)}\n`;
            msg += `├━━━━━━━━━━━━━━━━┤\n`;
            msg += `│ 📝 *Welcome Msg:*\n│ ${s.welcomeText ? (s.welcomeText.slice(0, 30) + '...') : '_Default_'}\n`;
            msg += `╰━━━━━━━━━━━━━━━━╯\n\n`;
            msg += `_Use .setwelcome, .setantilink, etc to modify_`;

            await m.reply(msg);
        });
    }
});

/**
 * GROUP EVENT TOGGLE
 */
addCommand({
    pattern: 'setgroupevents',
    alias: ['events'],
    desc: 'Toggle group events (promote/demote/join/left notifications)',
    category: 'group',
    handler: async (m, { conn, text, isGroup, isAdmin, isOwner }) => {
        if (!isGroup) return m.reply('❌ Group Only.');
        if (!isAdmin && !isOwner) return m.reply('❌ Admin/Owner Only.');

        const action = parseAction(text);
        if (action === null) return m.reply('❌ Usage: .events on/off');

        await withReaction(conn, m, '⚙️', async () => {
            await setGroupSetting(m.chat, 'GROUP_EVENTS', action);
            await m.reply(`✅ Group events notification is now *${action ? 'ENABLED' : 'DISABLED'}*`);
        });
    }
});

/**
 * WELCOME TOGGLE
 */
addCommand({
    pattern: 'setwelcome',
    alias: ['welcome', 'welc'],
    desc: 'Toggle welcome message for this group',
    category: 'group',
    handler: async (m, { conn, text, isGroup, isAdmin, isOwner }) => {
        if (!isGroup) return m.reply('❌ Group Only.');
        if (!isAdmin && !isOwner) return m.reply('❌ Admin/Owner Only.');

        const action = parseAction(text);
        if (action === null) return m.reply('❌ Usage: .welcome on/off');

        await withReaction(conn, m, '👋', async () => {
            await setGroupSetting(m.chat, 'WELCOME', action);
            await m.reply(`✅ Welcome message is now *${action ? 'ENABLED' : 'DISABLED'}*`);
        });
    }
});

/**
 * GOODBYE TOGGLE
 */
addCommand({
    pattern: 'setgoodbye',
    alias: ['goodbye', 'bye'],
    desc: 'Toggle goodbye message for this group',
    category: 'group',
    handler: async (m, { conn, text, isGroup, isAdmin, isOwner }) => {
        if (!isGroup) return m.reply('❌ Group Only.');
        if (!isAdmin && !isOwner) return m.reply('❌ Admin/Owner Only.');

        const action = parseAction(text);
        if (action === null) return m.reply('❌ Usage: .goodbye on/off');

        await withReaction(conn, m, '👋', async () => {
            await setGroupSetting(m.chat, 'GOODBYE', action);
            await m.reply(`✅ Goodbye message is now *${action ? 'ENABLED' : 'DISABLED'}*`);
        });
    }
});

/**
 * WELCOME MESSAGE TEXT
 */
addCommand({
    pattern: 'welcomemessage',
    alias: ['setwelcomemsg', 'welcometext'],
    desc: 'Set custom welcome text for this group',
    category: 'group',
    handler: async (m, { conn, text, isGroup, isAdmin, isOwner }) => {
        if (!isGroup) return m.reply('❌ Group Only.');
        if (!isAdmin && !isOwner) return m.reply('❌ Admin/Owner Only.');

        if (!text) return m.reply('❌ Usage: .welcomemessage Welcome to our group!\nClear: .welcomemessage clear');

        await withReaction(conn, m, '📝', async () => {
            if (text.toLowerCase().trim() === 'clear') {
                await setGroupSetting(m.chat, 'WELCOME_TEXT', '');
                await m.reply('✅ Custom welcome message cleared.');
            } else {
                await setGroupSetting(m.chat, 'WELCOME_TEXT', text.trim());
                await m.reply(`✅ Welcome message set:\n\n${text.trim()}`);
            }
        });
    }
});

/**
 * GOODBYE MESSAGE TEXT
 */
addCommand({
    pattern: 'goodbyemessage',
    alias: ['setgoodbyemsg', 'goodbyetext'],
    desc: 'Set custom goodbye text for this group',
    category: 'group',
    handler: async (m, { conn, text, isGroup, isAdmin, isOwner }) => {
        if (!isGroup) return m.reply('❌ Group Only.');
        if (!isAdmin && !isOwner) return m.reply('❌ Admin/Owner Only.');

        if (!text) return m.reply('❌ Usage: .goodbyemessage See you next time!\nClear: .goodbyemessage clear');

        await withReaction(conn, m, '📝', async () => {
            if (text.toLowerCase().trim() === 'clear') {
                await setGroupSetting(m.chat, 'GOODBYE_TEXT', '');
                await m.reply('✅ Custom goodbye message cleared.');
            } else {
                await setGroupSetting(m.chat, 'GOODBYE_TEXT', text.trim());
                await m.reply(`✅ Goodbye message set:\n\n${text.trim()}`);
            }
        });
    }
});

/**
 * GROUP PROFILE PICTURE TOOLS
 */
addCommand({
    pattern: 'gcpp',
    alias: ['gcfullpp', 'fullgcpp'],
    category: 'group',
    react: '🔮',
    desc: 'Set group full profile picture without cropping',
    handler: async (m, { conn, isGroup, isAdmin, isOwner }) => {
        if (!isGroup) return m.reply(global.messages.group);
        if (!isAdmin && !isOwner) return m.reply(global.messages.admin);

        const quoted = m.quoted || m;
        if (!/image/.test(quoted.mtype)) return m.reply(`${global.emojis.warning} Please reply to an image.`);

        try {
            await withReaction(conn, m, '⏳', async () => {
                const buffer = await quoted.download();
                const image = await Jimp.read(buffer);
                image.scaleToFit({ w: 720, h: 720 });
                const processedBuffer = await image.getBuffer('image/jpeg');

                await conn.query({
                    tag: 'iq',
                    attrs: {
                        to: S_WHATSAPP_NET,
                        type: 'set',
                        xmlns: 'w:profile:picture',
                        target: m.chat,
                    },
                    content: [{
                        tag: 'picture',
                        attrs: { type: 'image' },
                        content: processedBuffer
                    }]
                });
                await m.reply('✅ Group Profile picture updated successfully (Full Image).');
            });
        } catch (e) {
            log.error('Group FullPP failed', e);
            m.reply(UI.error('Profile Error', 'Failed to update group picture', e.message));
        }
    }
});

addCommand({
    pattern: 'getgcpp',
    alias: ['stealgcpp'],
    category: 'group',
    react: '🖼️',
    desc: 'Download current group profile picture',
    handler: async (m, { conn, isGroup }) => {
        if (!isGroup) return m.reply(global.messages.group);

        try {
            await withReaction(conn, m, '🔍', async () => {
                const pp = await conn.profilePictureUrl(m.chat, 'image');
                await conn.sendMessage(m.chat, {
                    image: { url: pp },
                    caption: `🖼️ *Group Profile Picture*\n> *${global.botName} Downloader*`
                }, { quoted: m });
            });
        } catch (e) {
            log.error('GetGCPP failed', e);
            m.reply(UI.error('Fetch Error', 'Failed to retrieve group picture', 'Group might have no PP or it\'s private.'));
        }
    }
});

/**
 * DISAPPEARING MESSAGES CONTROL
 */
addCommand({
    pattern: 'disapp',
    alias: ['ephemeral', 'vanish'],
    category: 'group',
    react: '⏱️',
    desc: 'Toggle disappearing messages for the group',
    handler: async (m, { conn, isGroup, isAdmin, isOwner, args }) => {
        if (!isGroup) return m.reply(global.messages.group);
        if (!isAdmin && !isOwner) return m.reply(global.messages.admin);

        const input = (args[0] || '').toLowerCase();
        let duration = 0;
        let label = 'Disabled';

        if (['on', '24h', '1'].includes(input)) { duration = 86400; label = '24 Hours'; }
        else if (['7d', '7'].includes(input)) { duration = 604800; label = '7 Days'; }
        else if (['90d', '90'].includes(input)) { duration = 7776000; label = '90 Days'; }
        else if (['off', '0'].includes(input)) { duration = 0; label = 'Disabled'; }
        else {
            return m.reply(`⏱️ *Disappearing Messages*\n\nUsage:\n• .disapp 24h/1\n• .disapp 7d/7\n• .disapp 90d/90\n• .disapp off`);
        }

        try {
            await conn.sendMessage(m.chat, { disappearingMessagesInChat: duration });
            await m.reply(`✅ Disappearing messages set to: *${label}*`);
            await react(conn, m, '✅');
        } catch (e) {
            log.error('Disapp failed', e);
            m.reply(UI.error('Settings Error', 'Failed to set disappearing messages', e.message));
        }
    }
});

/**
 * TARGETED DELETION
 */
addCommand({
    pattern: 'del',
    alias: ['delete', 'remove'],
    category: 'group',
    react: '🗑️',
    desc: 'Delete a quoted message (Bot must be admin)',
    handler: async (m, { conn, isGroup, isAdmin, isOwner, isBotAdmin }) => {
        if (!isGroup) return m.reply(global.messages.group);
        if (!isAdmin && !isOwner) return m.reply(global.messages.admin);
        if (!m.quoted) return m.reply(`${global.emojis.warning} Please reply to the message you want to delete.`);

        try {
            // Check if it's our message or we are admin
            if (!m.quoted.fromMe && !isBotAdmin) {
                return m.reply(global.messages.botAdmin);
            }

            await conn.sendMessage(m.chat, { delete: m.quoted.key });
            await react(conn, m, '✅');
        } catch (e) {
            log.error('Delete failed', e);
            m.reply(UI.error('Action Failed', 'Failed to delete message', e.message));
        }
    }
});

/**
 * RESET GROUP SETTINGS
 */
addCommand({
    pattern: 'resetgroup',
    alias: ['resetgc'],
    desc: 'Reset all group-specific settings to defaults',
    category: 'group',
    handler: async (m, { conn, isGroup, isOwner }) => {
        if (!isGroup) return m.reply('❌ Group Only.');
        if (!isOwner) return m.reply('❌ Owner Only.');

        await withReaction(conn, m, '🗑️', async () => {
            await resetAllGroupSettings(m.chat);
            await m.reply('✅ All settings for this group have been reset to defaults.');
        });
    }
});

log.info('Group Management plugin loaded');
