import { addCommand } from '../lib/plugins.js';
import { UI } from '../src/utils/design.js';
import { log } from '../src/utils/logger.js';
import { setSetting, getSetting, getSudoNumbers, getAllSettings, isSudoMode, setSudoMode } from '../lib/database.js';
import { getEnabledGroupSettings, getGroupSetting } from '../lib/database.js';
import { react, withReaction } from '../src/utils/messaging.js';
import { Jimp } from 'jimp';
import pkg from 'gifted-baileys';
const { S_WHATSAPP_NET, downloadContentFromMessage } = pkg;
import { exec } from 'node:child_process';
import path from 'path';
import fs from 'fs/promises';
import fsA from 'node:fs';
import moment from 'moment-timezone';
import util from 'util';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * RESTART COMMAND
 */
addCommand({
    pattern: 'restart',
    alias: ['reboot', 'restartnow'],
    category: 'owner',
    react: '🔄',
    desc: 'Restart the bot server',
    handler: async (m, { conn, isOwner }) => {
        if (!isOwner) return m.reply(global.messages.owner);

        await withReaction(conn, m, '🔄', async () => {
            await m.reply('🔄 *Restarting bot...*\n\nPlease wait a few seconds for the bot to come back online.');
            setTimeout(() => process.exit(0), 1500);
        });
    }
});

/**
 * SHUTDOWN COMMAND
 */
addCommand({
    pattern: 'shutdown',
    alias: ['logout', 'stopbot'],
    category: 'owner',
    react: '🛑',
    desc: 'Logout and shutdown the bot',
    handler: async (m, { conn, isOwner }) => {
        if (!isOwner) return m.reply(global.messages.owner);

        await withReaction(conn, m, '🛑', async () => {
            await m.reply('🛑 *Logging out and shutting down...*\nYou will need to re-scan QR to reconnect.');
            setTimeout(async () => {
                try { await conn.logout(); } catch (e) { log.error('Logout failed during shutdown', e); }
                process.exit(0);
            }, 1500);
        });
    }
});

/**
 * OWNER VCARD COMMAND
 */
addCommand({
    pattern: 'owner',
    alias: ['creator', 'dev'],
    category: 'owner',
    react: '👑',
    desc: 'Get Bot Owner contact',
    handler: async (m, { conn, isOwner }) => {
        // Shared with everyone but restricted if wanted
        const ownerNum = global.owner[0] || conn.user.id.split(':')[0];
        const ownerName = global.author || 'Mantra Owner';

        const vcard = 'BEGIN:VCARD\n' +
            'VERSION:3.0\n' +
            `FN:${ownerName}\n` +
            `ORG:${global.botName};\n` +
            `TEL;type=CELL;type=VOICE;waid=${ownerNum}:${ownerNum}\n` +
            'END:VCARD';

        await conn.sendMessage(m.chat, {
            contacts: {
                displayName: ownerName,
                contacts: [{ vcard }]
            }
        }, { quoted: m });
        await react(conn, m, '✅');
    }
});

/**
 * SHELL / EXEC COMMAND (ENHANCED)
 */
addCommand({
    pattern: 'shell',
    alias: ['exec', 'sh', 'ex', 'terminal'],
    category: 'owner',
    react: '💻',
    desc: 'Run shell commands with advanced output handling',
    handler: async (m, { conn, isOwner, text }) => {
        if (!isOwner) return m.reply(global.messages.owner);
        if (!text) return m.reply(`${global.emojis.warning} Please provide a command.`);

        await react(conn, m, '⏳');
        exec(text, { maxBuffer: 10 * 1024 * 1024 }, async (err, stdout, stderr) => {
            try {
                if (err) return m.reply(`${global.emojis.error} *Error:* ${err.message}`);
                if (stderr) await m.reply(`${global.emojis.warning} *stderr:* ${stderr}`);

                if (stdout && stdout.length > 8000) {
                    await handleLargeOutput(conn, m, stdout);
                } else if (stdout) {
                    await m.reply(stdout);
                } else if (!stderr) {
                    await m.reply('✅ Executed (No output)');
                }
                await react(conn, m, '✅');
            } catch (e) {
                log.error('Shell command handling failed', e);
                m.reply(`${global.emojis.error} Output handling failed: ${e.message}`);
            }
        });
    }
});

/**
 * QUICK EVAL COMMAND (>)
 */
addCommand({
    pattern: '>',
    on: 'body',
    category: 'owner',
    desc: 'Quick JS evaluation',
    handler: async (m, { conn, isOwner, body, ...context }) => {
        if (!isOwner || !body.startsWith('>')) return;
        const code = body.slice(1).trim();
        if (!code) return;

        try {
            await react(conn, m, '🧪');

            // Extensive context for eval
            const evalContext = {
                m, conn, log, UI,
                db: {
                    get: getSetting,
                    set: setSetting,
                    all: await getAllSettings(),
                    groups: await getEnabledGroupSettings(),
                    isSudoMode
                },
                ...context,
                require
            };

            let evaled = await eval(`(async () => { 
                const { ${Object.keys(evalContext).join(', ')} } = evalContext;
                ${code.includes('return') ? code : 'return ' + code} 
            })()`);

            if (typeof evaled !== 'string') evaled = util.inspect(evaled, { depth: 2 });

            await conn.sendMessage(m.chat, { text: `\`\`\`javascript\n${evaled}\n\`\`\`` }, { quoted: m });
            await react(conn, m, '✅');
        } catch (e) {
            log.error('Eval failed', e);
            m.reply(`❌ *Eval Error:*\n\`\`\`${e.message}\`\`\``);
            await react(conn, m, '❌');
        }
    }
});

/**
 * COMMAND EXTRACTION (.cmd)
 */
addCommand({
    pattern: 'cmd',
    alias: ['getcmd', 'source'],
    category: 'owner',
    react: '📄',
    desc: 'Get source code of a command',
    handler: async (m, { conn, isOwner, text }) => {
        if (!isOwner) return m.reply(global.messages.owner);
        if (!text) return m.reply(`${global.emojis.warning} Usage: .cmd <command_name>`);

        try {
            const { commands } = await import('../lib/plugins.js');
            const target = text.trim().toLowerCase();
            const cmd = commands[target];

            if (!cmd) return m.reply(`${global.emojis.error} Command '${target}' not found.`);

            // Assuming we might have filename in the future, for now we search plugins dir
            const pluginsDir = path.join(process.cwd(), 'plugins');
            const files = await fs.readdir(pluginsDir);

            let source = 'Source mapping not found.';
            let fileName = 'unknown.js';

            for (const file of files) {
                if (!file.endsWith('.js')) continue;
                const content = await fs.readFile(path.join(pluginsDir, file), 'utf-8');
                if (content.includes(`pattern: '${target}'`) || content.includes(`pattern: "${target}"`)) {
                    source = content;
                    fileName = file;
                    break;
                }
            }

            const header = `✧ *COMMAND SOURCE:* ${target} ✧\n📁 *File:* ${fileName}\n${global.divider}\n\n`;

            if (source.length > 8000) {
                await conn.sendMessage(m.chat, {
                    document: Buffer.from(source),
                    fileName: `${target}.js`,
                    mimetype: 'application/javascript',
                    caption: header
                }, { quoted: m });
            } else {
                await m.reply(header + `\`\`\`javascript\n${source}\n\`\`\``);
            }
            await react(conn, m, '✅');
        } catch (e) {
            log.error('Cmd fetch failed', e);
            m.reply(UI.error('Fetch Error', 'Failed to retrieve command source', e.message));
        }
    }
});

/**
 * CACHED METADATA (.cachedmeta)
 */
addCommand({
    pattern: 'cachedmeta',
    alias: ['gcmeta'],
    category: 'owner',
    react: '📋',
    desc: 'View cached group metadata',
    handler: async (m, { conn, isOwner, isGroup }) => {
        if (!isOwner) return m.reply(global.messages.owner);
        const jid = m.chat;
        if (!isGroup) return m.reply(global.messages.group);

        try {
            const { groupCache } = await import('../gift/connection/groupCache.js').catch(() => ({}));
            const meta = groupCache?.get?.(jid) || await conn.groupMetadata(jid);

            const msg = `╭━━━━━━━━━━━╮\n` +
                `│ 📋 *CACHED METADATA*\n` +
                `├━━━━━━━━━━━┤\n` +
                `│ *Name:* ${meta.subject}\n` +
                `│ *JID:* ${jid}\n` +
                `│ *Members:* ${meta.participants?.length}\n` +
                `│ *Owner:* @${meta.owner?.split('@')[0]}\n` +
                `│ *Created:* ${new Date(meta.creation * 1000).toLocaleDateString()}\n` +
                `╰━━━━━━━━━━━╯`;

            await m.reply(msg, { mentions: [meta.owner] });
            await react(conn, m, '✅');
        } catch (e) {
            log.error('Metadata fetch failed', e);
            m.reply(UI.error('Cache Error', 'Failed to retrieve metadata', e.message));
        }
    }
});

/**
 * UTILS
 */
async function handleLargeOutput(conn, m, stdout) {
    const filename = `output_${Date.now()}.txt`;
    await conn.sendMessage(m.chat, {
        document: Buffer.from(stdout),
        fileName: filename,
        mimetype: 'text/plain',
        caption: `> *Command Output (Large File)*`
    }, { quoted: m });
}

/**
 * JID / LID COMMANDS
 */
addCommand({
    pattern: 'jid',
    alias: ['getjid', 'id'],
    category: 'owner',
    react: '🆔',
    desc: 'Get JID of current chat or quoted user',
    handler: async (m, { conn, isOwner }) => {
        if (!isOwner) return m.reply(global.messages.owner);
        const target = m.quoted ? m.quoted.sender : m.chat;
        await m.reply(`🆔 *JID:* \`${target}\``);
        await react(conn, m, '✅');
    }
});

addCommand({
    pattern: 'getlid',
    alias: ['lid'],
    category: 'owner',
    react: '🆔',
    desc: 'Get user JID from LID or vice versa',
    handler: async (m, { conn, isOwner, text }) => {
        if (!isOwner) return m.reply(global.messages.owner);
        const target = m.quoted ? m.quoted.sender : (text?.trim() || m.chat);

        try {
            let result = target;
            if (target.includes('@lid')) {
                result = await conn.getJidFromLid(target) || target;
            } else if (target.includes('@s.whatsapp.net')) {
                result = await conn.getLidFromJid(target) || target;
            }
            await m.reply(`🆔 *Result:* \`${result}\``);
            await react(conn, m, '✅');
        } catch (e) {
            m.reply(target); // Fallback to raw ID
        }
    }
});

/**
 * PROFILE PICTURE TOOLS
 */
addCommand({
    pattern: 'fullpp',
    alias: ['full profile'],
    category: 'owner',
    react: '🔮',
    desc: 'Set high-res profile picture without cropping',
    handler: async (m, { conn, isOwner }) => {
        if (!isOwner) return m.reply(global.messages.owner);
        const quoted = m.quoted || m;
        if (!/image/.test(quoted.mtype)) return m.reply(`${global.emojis.warning} Please reply to an image.`);

        try {
            await withReaction(conn, m, '⏳', async () => {
                const buffer = await quoted.download();
                const image = await Jimp.read(buffer);

                // Crop and scale essentially ensuring it's "full" but optimized for WhatsApp
                image.scaleToFit({ w: 720, h: 720 });
                const processedBuffer = await image.getBuffer('image/jpeg');

                await conn.query({
                    tag: 'iq',
                    attrs: {
                        to: S_WHATSAPP_NET,
                        type: 'set',
                        xmlns: 'w:profile:picture',
                    },
                    content: [{
                        tag: 'picture',
                        attrs: { type: 'image' },
                        content: processedBuffer
                    }]
                });
                await m.reply('✅ Profile picture updated (Full Size)');
            });
        } catch (e) {
            log.error('FullPP failed', e);
            m.reply(UI.error('Profile Error', 'Failed to update profile picture', e.message));
        }
    }
});

/**
 * WHOIS / PROFILE DETAILS
 */
addCommand({
    pattern: 'whois',
    alias: ['profileinfo'],
    category: 'owner',
    react: '👤',
    desc: 'Get detailed information about a user',
    handler: async (m, { conn, isOwner, text }) => {
        if (!isOwner) return m.reply(global.messages.owner);
        const user = m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted ? m.quoted.sender : (text ? text.replace(/[^0-9]/g, '') + '@s.whatsapp.net' : null);

        if (!user) return m.reply(`${global.emojis.warning} Usage: Reply to someone or tag them.`);

        try {
            await withReaction(conn, m, '🔍', async () => {
                let pp;
                try { pp = await conn.profilePictureUrl(user, 'image'); } catch (e) { pp = 'https://telegra.ph/file/9521e9ee2fdbd0d6f4f1c.jpg'; }

                let status = 'No Info';
                let setAt = 'N/A';
                try {
                    const data = await conn.fetchStatus(user);
                    status = data.status || status;
                    if (data.setAt) setAt = moment(data.setAt).format('YYYY-MM-DD HH:mm:ss');
                } catch (e) { }

                const caption = `╭━━━━━━━━━━━━━━━╮\n` +
                    `│ 👤 *USER PROFILE*\n` +
                    `├━━━━━━━━━━━━━━━┤\n` +
                    `│ 👤 *User:* @${user.split('@')[0]}\n` +
                    `│ 📞 *JID:* ${user}\n` +
                    `│ 📝 *About:* ${status}\n` +
                    `│ 🕒 *Updated:* ${setAt}\n` +
                    `╰━━━━━━━━━━━━━━━╯\n\n` +
                    `> *${global.botName} Profiler*`;

                await conn.sendMessage(m.chat, {
                    image: { url: pp },
                    caption,
                    mentions: [user]
                }, { quoted: m });
            });
        } catch (e) {
            log.error('Whois failed', e);
            m.reply(UI.error('Profile Fetch Error', 'Failed to retrieve user data', e.message));
        }
    }
});

/**
 * BLOCK / UNBLOCK / BLOCKLIST
 */
addCommand({
    pattern: 'block',
    category: 'owner',
    react: '🚫',
    desc: 'Block a user',
    handler: async (m, { conn, isOwner }) => {
        if (!isOwner) return m.reply(global.messages.owner);
        const user = m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted ? m.quoted.sender : null;
        if (!user) return m.reply(`${global.emojis.warning} Tag or reply to a user to block.`);

        try {
            await conn.updateBlockStatus(user, 'block');
            await m.reply(`✅ *Blocked* @${user.split('@')[0]}`, { mentions: [user] });
            await react(conn, m, '✅');
        } catch (e) {
            log.error('Block failed', e);
            m.reply(UI.error('Action Failed', 'Failed to block user', e.message));
        }
    }
});

addCommand({
    pattern: 'unblock',
    category: 'owner',
    react: '✅',
    desc: 'Unblock a user',
    handler: async (m, { conn, isOwner }) => {
        if (!isOwner) return m.reply(global.messages.owner);
        const user = m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted ? m.quoted.sender : null;
        if (!user) return m.reply(`${global.emojis.warning} Tag or reply to a user to unblock.`);

        try {
            await conn.updateBlockStatus(user, 'unblock');
            await m.reply(`✅ *Unblocked* @${user.split('@')[0]}`, { mentions: [user] });
            await react(conn, m, '✅');
        } catch (e) {
            log.error('Unblock failed', e);
            m.reply(UI.error('Action Failed', 'Failed to unblock user', e.message));
        }
    }
});

/**
 * SUDO MANAGEMENT
 */
addCommand({
    pattern: 'setsudo',
    alias: ['addsudo'],
    category: 'owner',
    react: '👑',
    desc: 'Add a user to sudo list',
    handler: async (m, { conn, isOwner, text }) => {
        if (!isOwner) return m.reply(global.messages.owner);
        const user = m.mentionedJid[0] ? m.mentionedJid[0].split('@')[0] : (m.quoted ? m.quoted.sender.split('@')[0] : text?.trim());
        if (!user) return m.reply(`${global.emojis.warning} Tag, reply or provide a number.`);

        const sudoNumbers = await getSudoNumbers();
        if (sudoNumbers.includes(user)) return m.reply('⚠️ User is already in sudo list.');

        sudoNumbers.push(user);
        await setSetting('SUDO_NUMBERS', sudoNumbers.join(','));
        await m.reply(`✅ Added @${user} to sudo list.`, { mentions: [`${user}@s.whatsapp.net`] });
        await react(conn, m, '✅');
    }
});

addCommand({
    pattern: 'delsudo',
    alias: ['remsudo'],
    category: 'owner',
    react: '👑',
    desc: 'Remove a user from sudo list',
    handler: async (m, { conn, isOwner, text }) => {
        if (!isOwner) return m.reply(global.messages.owner);
        const user = m.mentionedJid[0] ? m.mentionedJid[0].split('@')[0] : (m.quoted ? m.quoted.sender.split('@')[0] : text?.trim());
        if (!user) return m.reply(`${global.emojis.warning} Tag, reply or provide a number.`);

        let sudoNumbers = await getSudoNumbers();
        if (!sudoNumbers.includes(user)) return m.reply('⚠️ User is not in sudo list.');

        sudoNumbers = sudoNumbers.filter(n => n !== user);
        await setSetting('SUDO_NUMBERS', sudoNumbers.join(','));
        await m.reply(`✅ Removed @${user} from sudo list.`, { mentions: [`${user}@s.whatsapp.net`] });
        await react(conn, m, '✅');
    }
});

/**
 * FORWARD COMMAND
 */
addCommand({
    pattern: 'forward',
    alias: ['fwd'],
    category: 'owner',
    react: '↩️',
    desc: 'Forward a quoted message to a target JID',
    handler: async (m, { conn, isOwner, args, text }) => {
        if (!isOwner) return m.reply(global.messages.owner);
        if (!m.quoted) return m.reply(`${global.emojis.warning} Please reply to a message.`);
        if (!args[0]) return m.reply(`${global.emojis.warning} Usage: .fwd <JID> [caption]`);

        const target = args[0].includes('@') ? args[0] : args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net';
        const caption = text.split(' ').slice(1).join(' ') || '';

        try {
            await conn.copyNForward(target, m.quoted.message, true, { caption: caption || undefined });
            await m.reply(`✅ Forwarded to: ${target}`);
            await react(conn, m, '✅');
        } catch (e) {
            log.error('Forward failed', e);
            m.reply(UI.error('Forward Error', 'Failed to forward message', e.message));
        }
    }
});

/**
 * REPORT COMMAND
 */
addCommand({
    pattern: 'report',
    alias: ['request', 'bug'],
    category: 'owner',
    react: '💫',
    desc: 'Report a bug or request a new feature',
    handler: async (m, { conn, text, pushname }) => {
        if (!text) return m.reply(`${global.emojis.warning} Usage: .report <your message>\nExample: .report the YouTube downloader is slow`);

        const ownerNum = global.owner[0] || conn.user.id.split(':')[0];
        const report = `*| REPORT / REQUEST |*\n\n` +
            `*User:* @${m.sender.split('@')[0]}\n` +
            `*Name:* ${pushname}\n` +
            `*Message:* ${text}`;

        await conn.sendMessage(ownerNum + '@s.whatsapp.net', {
            text: report,
            mentions: [m.sender]
        }, { quoted: m });

        await m.reply('✨ *Report sent!* Thank you for your feedback. The owner will review it soon.');
        await react(conn, m, '✅');
    }
});

/**
 * RETURN (MESSAGE INSPECTOR)
 */
addCommand({
    pattern: 'return',
    alias: ['inspect', 'raw'],
    category: 'owner',
    react: '🔍',
    desc: 'Inspect the raw structure of a quoted message',
    handler: async (m, { conn, isOwner }) => {
        if (!isOwner) return m.reply(global.messages.owner);
        if (!m.quoted) return m.reply(`${global.emojis.warning} Please reply to a message to inspect.`);

        try {
            const raw = JSON.stringify(m.quoted, null, 2);
            const chunks = raw.match(/[\s\S]{1,4000}/g) || [raw];

            for (const chunk of chunks) {
                await m.reply(UI.format.codeBlock(chunk, 'json'));
            }
            await react(conn, m, '✅');
        } catch (error) {
            log.error('Inspect failed', error);
            await m.reply(UI.error('Inspect Failed', 'Could not parse message structure', error.message));
        }
    }
});

/**
 * SAVE COMMAND
 */
addCommand({
    pattern: 'save',
    alias: ['sv', 'getmedia'],
    category: 'owner',
    react: '💾',
    desc: 'Save a quoted media message to your personal chat',
    handler: async (m, { conn, isOwner }) => {
        if (!isOwner) return m.reply(global.messages.owner);
        if (!m.quoted) return m.reply(`${global.emojis.warning} Please reply to a media message to save.`);

        try {
            await react(conn, m, '⏳');
            // copyNForward is the most reliable way to save media to PM
            await conn.copyNForward(conn.user.id.split(':')[0] + '@s.whatsapp.net', m.quoted, true);
            await react(conn, m, '✅');
        } catch (error) {
            log.error('Save failed', error);
            await m.reply(UI.error('Save Failed', 'Failed to save media', error.message));
        }
    }
});

log.action('Owner plugin loaded', 'system');
