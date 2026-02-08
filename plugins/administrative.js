import { addCommand } from '../lib/plugins.js';
import { log } from '../src/utils/logger.js';
import { react, withReaction } from '../src/utils/messaging.js';
import { resetAllSettings, deleteAllNotes, setSudoMode } from '../lib/database.js';

/**
 * NUCLEAR RESET (STRICT OWNER ONLY)
 */
addCommand({
    pattern: 'resetdb',
    alias: ['wipedb', 'factoryresetbot'],
    desc: 'Reset EVERY setting and configuration in the database',
    category: 'owner',
    handler: async (m, { conn, text, isOwner }) => {
        if (!isOwner) return m.reply('❌ Owner Only.');

        if (text !== 'confirm') {
            return m.reply('⚠️ *CRITICAL WARNING: THIS WILL WIPE EVERYTHING!* ⚠️\n\n' +
                'This includes:\n' +
                '▸ Global settings\n' +
                '▸ All group configurations\n' +
                '▸ All sudo numbers\n' +
                '▸ All cached data\n\n' +
                'Type `.resetdb confirm` if you are absolutely sure.');
        }

        await withReaction(conn, m, '☢️', async () => {
            try {
                // This is a heavy operation
                await resetAllSettings();
                // Add more table wipes if needed
                log.action('Bot factory reset performed', 'admin', { owner: m.sender });
                await m.reply('🏁 *CRITICAL RESET COMPLETE*\n\nYour bot has been returned to factory settings. Please restart the process.');
            } catch (error) {
                log.error('Factory reset failed', error);
                throw error;
            }
        });
    }
});

/**
 * RESET SUDO
 */
addCommand({
    pattern: 'resetsudo',
    alias: ['clearsudo'],
    desc: 'Wipe all sudo permissions',
    category: 'owner',
    handler: async (m, { conn, isOwner }) => {
        if (!isOwner) return m.reply(UI.error('Owner Only', 'This command requires owner privileges.'));

        await withReaction(conn, m, '🗑️', async () => {
            await resetAllSettings();
            await m.reply('✅ All sudo permissions have been cleared.');
        });
    }
});

/**
 * GROUP ADMINISTRATION
 */

// KICK
addCommand({
    pattern: 'kick',
    alias: ['remove'],
    category: 'admin',
    desc: 'Remove a user from the group',
    handler: async (m, { conn, isGroup, isAdmin, isOwner, isBotAdmin, text }) => {
        if (!isGroup) return m.reply(UI.error('Group Only', 'Use this command in a group.'));
        if (!isAdmin && !isOwner) return m.reply(UI.error('Admin Only', 'You need to be an admin.'));
        if (!isBotAdmin) return m.reply(UI.error('Bot Not Admin', 'I need admin rights to kick users.'));

        const target = m.mentionedJid[0] || (m.quoted ? m.quoted.sender : (text ? text.replace(/[^0-9]/g, '') + '@s.whatsapp.net' : null));
        if (!target) return m.reply(UI.syntax('.kick', '@user', 'Kick a participant'));

        await withReaction(conn, m, '👢', async () => {
            await conn.groupParticipantsUpdate(m.chat, [target], 'remove');
            log.action('User kicked', 'admin', { group: m.chat, target, by: m.sender });
        });
    }
});

// ADD
addCommand({
    pattern: 'add',
    category: 'admin',
    desc: 'Add a user to the group',
    handler: async (m, { conn, isGroup, isAdmin, isOwner, isBotAdmin, text, groupMetadata }) => {
        if (!isGroup) return m.reply(UI.error('Group Only', 'Use this command in a group.'));
        if (!isAdmin && !isOwner) return m.reply(UI.error('Admin Only', 'You need to be an admin.'));
        if (!isBotAdmin) return m.reply(UI.error('Bot Not Admin', 'I need admin rights to add users.'));
        if (!text) return m.reply(UI.syntax('.add', 'number', 'Add a user (e.g. .add 254...)'));

        const target = text.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
        await withReaction(conn, m, '➕', async () => {
            const res = await conn.groupParticipantsUpdate(m.chat, [target], 'add');
            if (res[0].status === '403') {
                const code = await conn.groupInviteCode(m.chat);
                await conn.sendMessage(target, { text: `👋 *Group Invite*\n\nYou were invited to *${groupMetadata.subject}*\n\n🔗 https://chat.whatsapp.com/${code}` });
                m.reply('📩 User has privacy settings. Invite link sent.');
            } else if (res[0].status !== '200') {
                throw new Error('Could not add user.');
            }
        });
    }
});

// PROMOTE / DEMOTE
addCommand({
    pattern: 'promote',
    alias: ['admin'],
    category: 'admin',
    desc: 'Promote a user to Admin',
    handler: async (m, { conn, isGroup, isAdmin, isOwner, isBotAdmin, text }) => {
        if (!isGroup) return m.reply(UI.error('Group Only', 'Use this command in a group.'));
        if (!isAdmin && !isOwner) return m.reply(UI.error('Admin Only', 'You need to be an admin.'));
        if (!isBotAdmin) return m.reply(UI.error('Bot Not Admin', 'I need admin rights.'));

        const target = m.mentionedJid[0] || (m.quoted ? m.quoted.sender : null);
        if (!target) return m.reply(UI.syntax('.promote', '@user', 'Make someone admin'));

        await withReaction(conn, m, '👑', async () => {
            await conn.groupParticipantsUpdate(m.chat, [target], 'promote');
        });
    }
});

addCommand({
    pattern: 'demote',
    alias: ['unadmin'],
    category: 'admin',
    desc: 'Demote an Admin to member',
    handler: async (m, { conn, isGroup, isAdmin, isOwner, isBotAdmin, text }) => {
        if (!isGroup) return m.reply(UI.error('Group Only', 'Use this command in a group.'));
        if (!isAdmin && !isOwner) return m.reply(UI.error('Admin Only', 'You need to be an admin.'));
        if (!isBotAdmin) return m.reply(UI.error('Bot Not Admin', 'I need admin rights.'));

        const target = m.mentionedJid[0] || (m.quoted ? m.quoted.sender : null);
        if (!target) return m.reply(UI.syntax('.demote', '@user', 'Demote an admin'));

        await withReaction(conn, m, '👤', async () => {
            await conn.groupParticipantsUpdate(m.chat, [target], 'demote');
        });
    }
});

// GROUP LINK / REVOKE
addCommand({
    pattern: 'link',
    alias: ['invitelink'],
    category: 'admin',
    desc: 'Get group invite link',
    handler: async (m, { conn, isGroup, isBotAdmin, groupMetadata }) => {
        if (!isGroup) return m.reply(UI.error('Group Only', 'Use this command in a group.'));
        if (!isBotAdmin) return m.reply(UI.error('Bot Not Admin', 'I need admin rights to fetch link.'));

        const code = await conn.groupInviteCode(m.chat);
        await m.reply(`📦 *GROUP LINK*\n${global.divider}\nhttps://chat.whatsapp.com/${code}`);
    }
});

addCommand({
    pattern: 'revoke',
    alias: ['resetlink'],
    category: 'admin',
    desc: 'Reset group invite link',
    handler: async (m, { conn, isGroup, isAdmin, isOwner, isBotAdmin }) => {
        if (!isGroup) return m.reply(UI.error('Group Only', 'Use this command in a group.'));
        if (!isAdmin && !isOwner) return m.reply(UI.error('Admin Only', 'You need to be an admin.'));
        if (!isBotAdmin) return m.reply(UI.error('Bot Not Admin', 'I need admin rights.'));

        await withReaction(conn, m, '🔄', async () => {
            await conn.groupRevokeInvite(m.chat);
            await m.reply('✅ Group link has been reset.');
        });
    }
});

// TAG ALL
addCommand({
    pattern: 'tagall',
    alias: ['everyone'],
    category: 'admin',
    desc: 'Tag all group members',
    handler: async (m, { conn, isGroup, isAdmin, isOwner, groupMetadata, text }) => {
        if (!isGroup) return m.reply(UI.error('Group Only', 'Use this command in a group.'));
        if (!isAdmin && !isOwner) return m.reply(UI.error('Admin Only', 'You need to be an admin.'));

        const participants = groupMetadata.participants;
        let msg = `📣 *ANNOUNCEMENT*\n${global.divider}\n📄 *Message:* ${text || 'No Message'}\n\n`;
        for (let p of participants) {
            msg += `▸ @${p.id.split('@')[0]}\n`;
        }

        await conn.sendMessage(m.chat, { text: msg, mentions: participants.map(p => p.id) }, { quoted: m });
    }
});

log.action('Administrative plugin loaded', 'system');
