import { addCommand } from '../lib/plugins.js';
import { log } from '../src/utils/logger.js';
import { react, withReaction } from '../src/utils/messaging.js';
import { requireGroup, requireAdmin, requireBotAdmin, getGroupMeta } from '../src/utils/groupHelper.js';
import { sendInteractive, createSelectButton, createSection, createRow } from '../src/utils/buttons.js';
import { normalizeUserJid } from '../src/utils/jidHelper.js';

// Enhanced group admin panel - Refactored with utilities
addCommand({
    pattern: 'gadmin',
    alias: ['grouppanel', 'adminpanel'],
    desc: 'Interactive group admin panel',
    handler: async (m, { conn, isGroup, isUserAdmin, isBotAdmin }) => {
        // Validation using helpers
        if (!requireGroup(m, isGroup)) return;
        if (!requireAdmin(m, isUserAdmin)) return;

        // Create sections using button helpers
        const memberSection = createSection('Member Management', [
            createRow('gadmin_tagall', 'Tag All Members', 'Mention everyone', '📢'),
            createRow('gadmin_promote', 'Promote Member', 'Make admin', '⬆️'),
            createRow('gadmin_demote', 'Demote Admin', 'Remove admin', '⬇️'),
            createRow('gadmin_kick', 'Remove Member', 'Kick from group', '🚫')
        ]);

        const settingsSection = createSection('Group Settings', [
            createRow('gadmin_settings', 'Group Settings', 'Lock/unlock group', '🔒'),
            createRow('gadmin_link', 'Group Link', 'Get invite link', '🔗'),
            createRow('gadmin_revoke', 'Revoke Link', 'Reset invite link', '♻️'),
            createRow('gadmin_info', 'Group Info', 'View details', 'ℹ️')
        ]);

        const protectionSection = createSection('Protection', [
            createRow('gadmin_antilink', 'Anti-Link', 'Toggle anti-link', '🛡️'),
            createRow('gadmin_antidelete', 'Anti-Delete', 'Status', '🗑️')
        ]);

        const selectButton = createSelectButton('⚙️ Admin Actions', [
            memberSection,
            settingsSection,
            protectionSection
        ]);

        // Send using utility
        await sendInteractive(conn, m.chat, {
            title: '👑 Group Admin Panel',
            text: 'Manage your group with ease using the controls below:',
            footer: 'Select an action',
            buttons: [selectButton]
        });
    }
});

// Promote member
addCommand({
    pattern: 'promote',
    alias: ['toadmin'],
    desc: 'Promote member to admin',
    handler: async (m, { conn, isGroup, isUserAdmin, isBotAdmin, args }) => {
        if (!requireGroup(m, isGroup)) return;
        if (!requireAdmin(m, isUserAdmin)) return;
        if (!requireBotAdmin(m, isBotAdmin)) return;

        const quoted = m.quoted || m;
        const user = quoted.sender || (args[0] ? args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net' : null);

        if (!user) {
            return m.reply('⚠️ Tag or quote a message to promote the user.');
        }

        await withReaction(conn, m, '⏳', async () => {
            await conn.groupParticipantsUpdate(m.chat, [user], 'promote');
            log.action('Promoted user', 'group', { user, by: m.sender });
            await m.reply(`✅ @${user.split('@')[0]} is now an admin.`, { mentions: [user] });
        });
    }
});

// Demote admin
addCommand({
    pattern: 'demote',
    desc: 'Demote admin to member',
    handler: async (m, { conn, isGroup, isUserAdmin, isBotAdmin, args }) => {
        if (!requireGroup(m, isGroup)) return;
        if (!requireAdmin(m, isUserAdmin)) return;
        if (!requireBotAdmin(m, isBotAdmin)) return;

        const quoted = m.quoted || m;
        const user = quoted.sender || (args[0] ? args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net' : null);

        if (!user) {
            return m.reply('⚠️ Tag or quote a message to demote the user.');
        }

        await withReaction(conn, m, '⏳', async () => {
            await conn.groupParticipantsUpdate(m.chat, [user], 'demote');
            log.action('Demoted user', 'group', { user, by: m.sender });
            await m.reply(`✅ @${user.split('@')[0]} is no longer an admin.`, { mentions: [user] });
        });
    }
});

// Kick member
addCommand({
    pattern: 'kick',
    alias: ['remove'],
    desc: 'Remove member from group',
    handler: async (m, { conn, isGroup, isUserAdmin, isBotAdmin, args }) => {
        if (!requireGroup(m, isGroup)) return;
        if (!requireAdmin(m, isUserAdmin)) return;
        if (!requireBotAdmin(m, isBotAdmin)) return;

        const quoted = m.quoted || m;
        const user = quoted.sender || (args[0] ? args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net' : null);

        if (!user) {
            return m.reply('⚠️ Tag or quote a message to kick the user.');
        }

        await withReaction(conn, m, '⏳', async () => {
            await conn.groupParticipantsUpdate(m.chat, [user], 'remove');
            log.action('Kicked user', 'group', { user, by: m.sender });
            await m.reply(`✅ @${user.split('@')[0]} has been removed.`, { mentions: [user] });
        });
    }
});

// Add member
addCommand({
    pattern: 'add',
    alias: ['invite'],
    desc: 'Add member to group',
    handler: async (m, { conn, isGroup, isUserAdmin, isBotAdmin, args }) => {
        if (!requireGroup(m, isGroup)) return;
        if (!requireAdmin(m, isUserAdmin)) return;
        if (!requireBotAdmin(m, isBotAdmin)) return;

        if (!args[0]) {
            return m.reply('⚠️ Provide number to add\\n\\nExample: `.add 254712345678`');
        }

        const number = args[0].replace(/[^0-9]/g, '');
        const user = number + '@s.whatsapp.net';

        await withReaction(conn, m, '⏳', async () => {
            const result = await conn.groupParticipantsUpdate(m.chat, [user], 'add');

            if (result[0]?.status === '403') {
                // Privacy settings - send invite link
                const code = await conn.groupInviteCode(m.chat);
                const link = `https://chat.whatsapp.com/${code}`;

                await conn.sendMessage(user, {
                    text: `👋 You've been invited to a group!\\n\\n🔗 Link: ${link}`
                });

                await m.reply(`⚠️ @${number} has privacy settings. Invite sent to DM.`, { mentions: [user] });
            } else {
                log.action('Added user', 'group', { user, by: m.sender });
                await m.reply(`✅ @${number} has been added.`, { mentions: [user] });
            }
        });
    }
});

// Get group link
addCommand({
    pattern: 'link',
    alias: ['grouplink', 'gclink'],
    desc: 'Get group invite link',
    handler: async (m, { conn, isGroup, isUserAdmin, isBotAdmin }) => {
        if (!requireGroup(m, isGroup)) return;
        if (!requireAdmin(m, isUserAdmin)) return;
        if (!requireBotAdmin(m, isBotAdmin)) return;

        await withReaction(conn, m, '⏳', async () => {
            const code = await conn.groupInviteCode(m.chat);
            const link = `https://chat.whatsapp.com/${code}`;
            const meta = await getGroupMeta(conn, m.chat);

            await m.reply(
                `🔗 *Group Link*\\n\\n` +
                `*Name:* ${meta?.subject || 'N/A'}\\n` +
                `*Members:* ${meta?.participants?.length || 0}\\n\\n` +
                `*Link:* ${link}`
            );
        });
    }
});

// Revoke/reset group link
addCommand({
    pattern: 'revoke',
    alias: ['resetlink', 'newlink'],
    desc: 'Reset group invite link',
    handler: async (m, { conn, isGroup, isUserAdmin, isBotAdmin }) => {
        if (!requireGroup(m, isGroup)) return;
        if (!requireAdmin(m, isUserAdmin)) return;
        if (!requireBotAdmin(m, isBotAdmin)) return;

        await withReaction(conn, m, '⏳', async () => {
            await conn.groupRevokeInvite(m.chat);
            const newCode = await conn.groupInviteCode(m.chat);
            const newLink = `https://chat.whatsapp.com/${newCode}`;

            log.action('Revoked group link', 'group', { by: m.sender });
            await m.reply(
                `✅ *Link Reset*\\n\\n` +
                `Old link revoked. New link:\\n${newLink}`
            );
        });
    }
});

// Group info
addCommand({
    pattern: 'groupinfo',
    alias: ['ginfo', 'gcinfo'],
    desc: 'View group information',
    handler: async (m, { conn, isGroup }) => {
        if (!requireGroup(m, isGroup)) return;

        await withReaction(conn, m, '⏳', async () => {
            const meta = await getGroupMeta(conn, m.chat);

            if (!meta) {
                return m.reply('❌ Failed to fetch group info.');
            }

            const admins = meta.participants.filter(p => p.admin === 'admin' || p.admin === 'superadmin');
            const owner = meta.participants.find(p => p.admin === 'superadmin');

            const info =
                `📊 *Group Information*\\n\\n` +
                `*Name:* ${meta.subject}\\n` +
                `*Owner:* @${owner?.id?.split('@')[0] || 'Unknown'}\\n` +
                `*Created:* ${new Date(meta.creation * 1000).toLocaleDateString()}\\n` +
                `*Members:* ${meta.participants.length}\\n` +
                `*Admins:* ${admins.length}\\n` +
                `*Description:* ${meta.desc || 'None'}\\n\\n` +
                `*Settings:*\\n` +
                `• Locked: ${meta.announce ? 'Yes' : 'No'}\\n` +
                `• Edit Info: ${meta.restrict ? 'Admins Only' : 'All'}`;

            const mentions = owner ? [owner.id] : [];
            await m.reply(info, { mentions });
        });
    }
});

// Lock/Unlock group (mute/unmute)
addCommand({
    pattern: 'lock',
    alias: ['close', 'mute'],
    desc: 'Lock group (only admins can send)',
    handler: async (m, { conn, isGroup, isUserAdmin, isBotAdmin }) => {
        if (!requireGroup(m, isGroup)) return;
        if (!requireAdmin(m, isUserAdmin)) return;
        if (!requireBotAdmin(m, isBotAdmin)) return;

        await withReaction(conn, m, '⏳', async () => {
            await conn.groupSettingUpdate(m.chat, 'announcement');
            log.action('Locked group', 'group', { by: m.sender });
            await m.reply('🔒 Group locked. Only admins can send messages.');
        });
    }
});

addCommand({
    pattern: 'unlock',
    alias: ['open', 'unmute'],
    desc: 'Unlock group (all can send)',
    handler: async (m, { conn, isGroup, isUserAdmin, isBotAdmin }) => {
        if (!requireGroup(m, isGroup)) return;
        if (!requireAdmin(m, isUserAdmin)) return;
        if (!requireBotAdmin(m, isBotAdmin)) return;

        await withReaction(conn, m, '⏳', async () => {
            await conn.groupSettingUpdate(m.chat, 'not_announcement');
            log.action('Unlocked group', 'group', { by: m.sender });
            await m.reply('🔓 Group unlocked. All members can send messages.');
        });
    }
});

// Tag all members
addCommand({
    pattern: 'tagall',
    alias: ['all', 'everyone'],
    desc: 'Tag all group members',
    handler: async (m, { conn, isGroup, isUserAdmin, args }) => {
        if (!requireGroup(m, isGroup)) return;
        if (!requireAdmin(m, isUserAdmin)) return;

        await withReaction(conn, m, '⏳', async () => {
            const meta = await getGroupMeta(conn, m.chat);
            const mentions = meta.participants.map(p => p.id);

            const message = args.join(' ') || 'Everyone!';
            let text = `📢 *Tag All*\\n\\n${message}\\n\\n`;

            mentions.forEach((id, i) => {
                text += `${i + 1}. @${id.split('@')[0]}\\n`;
            });

            await conn.sendMessage(m.chat, { text, mentions }, { quoted: m });
        });
    }
});

// Export group participants as VCF
addCommand({
    pattern: 'vcf',
    alias: ['contacts', 'savecontact', 'scontact'],
    desc: 'Export all group participants as VCF contact file',
    category: 'group',
    handler: async (m, { conn, isGroup, isUserAdmin }) => {
        if (!requireGroup(m, isGroup)) return;
        if (!requireAdmin(m, isUserAdmin)) return;

        await withReaction(conn, m, '⏳', async () => {
            const meta = await getGroupMeta(conn, m.chat);
            if (!meta) return m.reply('❌ Failed to fetch group metadata.');

            const participants = meta.participants || [];
            const groupName = meta.subject || 'Group';

            if (participants.length === 0) {
                await react(conn, m, '❌');
                return m.reply('❌ No participants found in this group.');
            }

            let vcfContent = '';
            let count = 0;

            for (const member of participants) {
                const jid = member.id;
                if (!jid || !jid.endsWith('@s.whatsapp.net')) continue;

                const phone = jid.split('@')[0];
                count++;
                vcfContent += `BEGIN:VCARD\nVERSION:3.0\nFN:[${count}] +${phone}\nTEL;type=CELL;type=VOICE;waid=${phone}:+${phone}\nEND:VCARD\n`;
            }

            if (count === 0) {
                await react(conn, m, '❌');
                return m.reply('❌ Could not extract any valid contacts.');
            }

            await m.reply(`📦 *Generating VCF* for ${count} participants...`);

            await conn.sendMessage(m.chat, {
                document: Buffer.from(vcfContent.trim(), 'utf-8'),
                mimetype: 'text/vcard',
                fileName: `${groupName}.vcf`,
                caption: `✅ *VCF Export Complete*\n\n👥 *Contacts:* ${count}\n📁 *File:* ${groupName}.vcf`
            }, { quoted: m });
        });
    }
});

log.action('Group management plugin loaded (refactored)', 'system', { commands: 14 });