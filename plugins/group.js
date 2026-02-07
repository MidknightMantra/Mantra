import { addCommand } from '../lib/plugins.js';
import pkg from 'gifted-btns';
const { sendInteractiveMessage, sendButtons } = pkg;
import { log } from '../src/utils/logger.js';

// Enhanced group admin panel
addCommand({
    pattern: 'gadmin',
    alias: ['grouppanel', 'adminpanel'],
    desc: 'Interactive group admin panel',
    handler: async (m, { conn, isGroup, isUserAdmin, isBotAdmin }) => {
        if (!isGroup) return m.reply('⚠️ This command is for groups only.');
        if (!isUserAdmin) return m.reply('⚠️ Admin only command.');

        await sendInteractiveMessage(conn, m.chat, {
            title: '👑 Group Admin Panel',
            text: 'Manage your group with ease using the controls below:',
            footer: 'Select an action',
            interactiveButtons: [
                {
                    name: 'single_select',
                    buttonParamsJson: JSON.stringify({
                        title: '⚙️ Admin Actions',
                        sections: [
                            {
                                title: 'Member Management',
                                rows: [
                                    { id: 'gadmin_tagall', title: 'Tag All Members', description: 'Mention everyone', header: '📢' },
                                    { id: 'gadmin_promote', title: 'Promote Member', description: 'Make admin', header: '⬆️' },
                                    { id: 'gadmin_demote', title: 'Demote Admin', description: 'Remove admin', header: '⬇️' },
                                    { id: 'gadmin_kick', title: 'Remove Member', description: 'Kick from group', header: '🚫' }
                                ]
                            },
                            {
                                title: 'Group Settings',
                                rows: [
                                    { id: 'gadmin_settings', title: 'Group Settings', description: 'Lock/unlock group', header: '🔒' },
                                    { id: 'gadmin_link', title: 'Group Link', description: 'Get invite link', header: '🔗' },
                                    { id: 'gadmin_revoke', title: 'Revoke Link', description: 'Reset invite link', header: '♻️' },
                                    { id: 'gadmin_info', title: 'Group Info', description: 'View details', header: 'ℹ️' }
                                ]
                            },
                            {
                                title: 'Protection',
                                rows: [
                                    { id: 'gadmin_antilink', title: 'Anti-Link', description: 'Toggle anti-link', header: '🛡️' },
                                    { id: 'gadmin_antidelete', title: 'Anti-Delete', description: 'Status', header: '🗑️' }
                                ]
                            }
                        ]
                    })
                }
            ]
        });
    }
});

// Action handlers
addCommand({
    pattern: 'gadmin_tagall',
    handler: async (m, { conn }) => {
        await m.reply('💬 Please reply with your message:\n\n`.tagall <message>`');
    }
});

addCommand({
    pattern: 'gadmin_promote',
    handler: async (m, { conn }) => {
        await m.reply('⬆️ Tag the user to promote:\n\n`.promote @user`');
    }
});

addCommand({
    pattern: 'gadmin_demote',
    handler: async (m, { conn }) => {
        await m.reply('⬇️ Tag the admin to demote:\n\n`.demote @user`');
    }
});

addCommand({
    pattern: 'gadmin_kick',
    handler: async (m, { conn }) => {
        await m.reply('🚫 Tag the user to remove:\n\n`.kick @user`');
    }
});

addCommand({
    pattern: 'gadmin_settings',
    handler: async (m, { conn, isGroup }) => {
        if (!isGroup) return;

        await sendButtons(conn, m.chat, {
            text: '🔒 *Group Settings*\n\nChoose a setting to modify:',
            footer: 'Current settings will be applied',
            buttons: [
                { id: 'gsettings_lock', text: '🔒 Lock Group' },
                { id: 'gsettings_unlock', text: '🔓 Unlock Group' }
            ]
        });
    }
});

addCommand({
    pattern: 'gsettings_lock',
    handler: async (m, { conn, isGroup }) => {
        if (!isGroup) return;
        try {
            await conn.groupSettingUpdate(m.chat, 'announcement');
            await m.reply('🔒 Group locked! Only admins can send messages.');
        } catch (e) {
            await m.reply('❌ Failed to lock group. Make sure I\'m an admin!');
        }
    }
});

addCommand({
    pattern: 'gsettings_unlock',
    handler: async (m, { conn, isGroup }) => {
        if (!isGroup) return;
        try {
            await conn.groupSettingUpdate(m.chat, 'not_announcement');
            await m.reply('🔓 Group unlocked! Everyone can send messages.');
        } catch (e) {
            await m.reply('❌ Failed to unlock group. Make sure I\'m an admin!');
        }
    }
});

addCommand({
    pattern: 'gadmin_link',
    handler: async (m, { conn, args, text, isOwner, isGroup, groupMetadata, isUserAdmin, isBotAdmin }) => {
        const cmd = (await import('../lib/plugins.js')).commands['link'];
        if (cmd) await cmd.handler(m, { conn, args, text, isOwner, isGroup, groupMetadata, isUserAdmin, isBotAdmin });
    }
});

addCommand({
    pattern: 'gadmin_revoke',
    handler: async (m, { conn, args, text, isOwner, isGroup, groupMetadata, isUserAdmin, isBotAdmin }) => {
        const cmd = (await import('../lib/plugins.js')).commands['revoke'];
        if (cmd) await cmd.handler(m, { conn, args, text, isOwner, isGroup, groupMetadata, isUserAdmin, isBotAdmin });
    }
});

addCommand({
    pattern: 'gadmin_info',
    handler: async (m, { conn, args, text, isOwner, isGroup, groupMetadata, isUserAdmin, isBotAdmin }) => {
        const cmd = (await import('../lib/plugins.js')).commands['groupinfo'];
        if (cmd) await cmd.handler(m, { conn, args, text, isOwner, isGroup, groupMetadata, isUserAdmin, isBotAdmin });
    }
});

addCommand({
    pattern: 'gadmin_antilink',
    handler: async (m, { conn, args, text, isOwner, isGroup, groupMetadata, isUserAdmin, isBotAdmin }) => {
        const cmd = (await import('../lib/plugins.js')).commands['antilink'];
        if (cmd) await cmd.handler(m, { conn, args, text, isOwner, isGroup, groupMetadata, isUserAdmin, isBotAdmin });
    }
});

addCommand({
    pattern: 'gadmin_antidelete',
    handler: async (m, { conn }) => {
        await m.reply('🗑️ *Anti-Delete Status*\n\nAnti-Delete is **ALWAYS ON** globally for all chats.\n\nDeleted messages are automatically saved to your Saved Messages.');
    }
});

// Keep existing tagall and kick commands but enhance them
addCommand({
    pattern: 'tagall',
    desc: 'Tag all members in a group',
    handler: async (m, { conn, isGroup, groupMetadata, text, isOwner }) => {
        if (!isGroup) return m.reply('⚠️ Group only command.');
        if (!isOwner && !m.key.fromMe) return m.reply('⚠️ Admin/Owner only.');

        let members = groupMetadata.participants;
        let txt = `📢 *GROUP ANNOUNCEMENT*\n\n${text || 'Hello everyone!'}\n\n`;

        for (let mem of members) {
            txt += `@${mem.id.split('@')[0]}\n`;
        }

        await conn.sendMessage(m.chat, {
            text: txt,
            mentions: members.map(a => a.id)
        }, { quoted: m });
    }
});

addCommand({
    pattern: 'kick',
    desc: 'Remove a member from the group',
    handler: async (m, { conn, isGroup, text }) => {
        if (!isGroup) return m.reply('⚠️ Group only.');
        if (!m.mentionedJid[0]) return m.reply('⚠️ Tag someone to kick.');

        try {
            await conn.groupParticipantsUpdate(m.chat, [m.mentionedJid[0]], 'remove');
            await m.reply('✅ User removed from the group.');
        } catch (e) {
            await m.reply('❌ Failed to remove user. Make sure I\'m an admin!');
        }
    }
});