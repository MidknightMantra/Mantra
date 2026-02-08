import { addCommand, commands } from '../lib/plugins.js';
import { exec, spawn } from 'child_process';
import fs from 'fs';
import fsA from 'fs'; // Alias for consistency with user snippet
import path from 'path';
import { fileURLToPath } from 'url';
import util from 'util';
import moment from 'moment-timezone';
import { Jimp } from 'jimp';
import { groupCache } from '../src/utils/groupCache.js';
import {
    getAllSettings,
    getSudoNumbers,
    setSudo,
    delSudo,
    getEnabledGroupSettings,
    getGroupSetting,
    setGroupSetting
} from '../lib/database.js';
import { log } from '../src/utils/logger.js';
import { S_WHATSAPP_NET } from 'gifted-baileys';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Developer numbers (Hardcoded as per user request)
const DEV_NUMBERS = [
    "254715206562",
    "254114018035",
    "254728782591",
    "254799916673",
    "254762016957",
    "254113174209",
];

// Helper to extract file path from shell output
function extractFilePath(text) {
    const match = text.match(/(\/[^\s]+\.zip)/);
    return match ? match[0].trim() : null;
}

/**
 * RESTART
 */
addCommand({
    pattern: 'restart',
    alias: ['reboot', 'restartnow'],
    react: '🔄',
    category: 'owner',
    desc: 'Restart the bot server',
    handler: async (m, { isOwner }) => {
        if (!isOwner) return m.reply(global.messages.owner);
        await m.reply("🔄 *Restarting bot...*\nPlease wait a few seconds.");
        setTimeout(() => process.exit(0), 1500);
    }
});

/**
 * SHUTDOWN
 */
addCommand({
    pattern: 'shutdown',
    alias: ['logout', 'stopbot'],
    react: '🛑',
    category: 'owner',
    desc: 'Shutdown the bot',
    handler: async (m, { conn, isOwner }) => {
        if (!isOwner) return m.reply(global.messages.owner);
        await m.reply("🛑 *Shutting down...*");
        setTimeout(async () => {
            try { await conn.logout(); } catch (e) { }
            process.exit(0);
        }, 1500);
    }
});

/**
 * OWNER VCARD
 */
addCommand({
    pattern: 'owner',
    react: '👑',
    category: 'owner',
    desc: 'Get Bot Owner',
    handler: async (m, { conn }) => {
        const ownerName = global.ownerName || "Bot Owner";
        const ownerNumber = global.ownerNumber || "0000000000";
        const botName = global.botName || "Bot";

        const vcard =
            "BEGIN:VCARD\n" +
            "VERSION:3.0\n" +
            `FN:${ownerName}\n` +
            `ORG:${botName};\n` +
            `TEL;type=CELL;type=VOICE;waid=${ownerNumber}:${ownerNumber}\n` +
            "END:VCARD";

        await conn.sendMessage(m.chat, {
            contacts: {
                displayName: ownerName,
                contacts: [{ vcard }],
            },
        }, { quoted: m });
    }
});

/**
 * SHELL
 */
addCommand({
    pattern: 'shell',
    alias: ['exec', 'sh', 'term'],
    react: '💻',
    category: 'owner',
    desc: 'Run shell commands',
    handler: async (m, { text, isOwner, conn }) => {
        if (!isOwner) return m.reply(global.messages.owner);
        if (!text) return m.reply("❌ Please provide a command!");

        exec(text, async (err, stdout, stderr) => {
            if (err) return m.reply(`❌ Error: ${err.message}`);
            if (stderr) return m.reply(`⚠️ stderr: ${stderr}`);
            if (stdout) {
                if (stdout.length > 2000) {
                    await conn.sendMessage(m.chat, { document: Buffer.from(stdout), fileName: 'output.txt', mimetype: 'text/plain' }, { quoted: m });
                } else {
                    m.reply(stdout);
                }
            } else {
                m.reply("✅ Executed (no output)");
            }
        });
    }
});

/**
 * EVAL (>)
 */
addCommand({
    pattern: '>',
    on: 'body',
    category: 'owner',
    desc: 'Eval JS',
    handler: async (m, { text, isOwner, conn, body }) => {
        if (!isOwner || !body.startsWith('>')) return;
        const code = body.slice(1).trim();
        if (!code) return;

        try {
            // Context for eval
            const evalContext = {
                conn, m, text, isOwner,
                db: {
                    settings: await getAllSettings(),
                    groups: await getEnabledGroupSettings(),
                    sudo: await getSudoNumbers()
                },
                groupCache,
                util, fs, path,
                require
            };

            const result = await (async () => {
                return eval(code); // Basic eval for now, can be improved
            })();

            let output = util.inspect(result, { depth: 1 });
            if (output.length > 2000) output = output.substring(0, 2000) + '...';
            m.reply(`\`\`\`${output}\`\`\``);
        } catch (e) {
            m.reply(`❌ Error: ${e.message}`);
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
    desc: 'Add sudo user',
    handler: async (m, { text, isOwner, conn }) => {
        if (!isOwner) return m.reply(global.messages.owner);
        let target = text ? text.replace(/\D/g, '') : m.quoted ? m.quoted.sender.split('@')[0] : null;
        if (!target) return m.reply("❌ Provide number or quote user");

        if (DEV_NUMBERS.includes(target)) return m.reply("❌ User is a developer.");

        await setSudo(target);
        m.reply(`✅ Added @${target} to sudo.`, { mentions: [target + '@s.whatsapp.net'] });
    }
});

addCommand({
    pattern: 'delsudo',
    alias: ['removesudo'],
    category: 'owner',
    desc: 'Remove sudo user',
    handler: async (m, { text, isOwner }) => {
        if (!isOwner) return m.reply(global.messages.owner);
        let target = text ? text.replace(/\D/g, '') : m.quoted ? m.quoted.sender.split('@')[0] : null;
        if (!target) return m.reply("❌ Provide number or quote user");

        if (DEV_NUMBERS.includes(target)) return m.reply("❌ Cannot remove developer.");

        await delSudo(target);
        m.reply(`✅ Removed @${target} from sudo.`, { mentions: [target + '@s.whatsapp.net'] });
    }
});

addCommand({
    pattern: 'getsudo',
    alias: ['listsudo'],
    category: 'owner',
    desc: 'List sudo users',
    handler: async (m, { isOwner }) => {
        if (!isOwner) return m.reply(global.messages.owner);
        const sudos = await getSudoNumbers();
        m.reply(`👑 *Sudo Users:*\n\n${sudos.map(s => `• @${s}`).join('\n') || "None"}`, { mentions: sudos.map(s => s + '@s.whatsapp.net') });
    }
});

/**
 * UTILS
 */
addCommand({
    pattern: 'jid',
    category: 'owner',
    desc: 'Get JID',
    handler: async (m, { isOwner }) => {
        if (!isOwner) return m.reply(global.messages.owner);
        const jid = m.quoted ? m.quoted.sender : m.chat;
        m.reply(jid);
    }
});

addCommand({
    pattern: 'cmd',
    category: 'owner',
    desc: 'Get command source',
    handler: async (m, { text, isOwner, conn }) => {
        if (!isOwner) return m.reply(global.messages.owner);
        if (!text) return m.reply("❌ Provide command name");

        // This requires searching files, simplified for now to search plugin dir
        const pluginDir = path.join(__dirname);
        const files = fs.readdirSync(pluginDir);
        for (const file of files) {
            const content = fs.readFileSync(path.join(pluginDir, file), 'utf8');
            if (content.includes(`pattern: '${text}'`) || content.includes(`pattern: "${text}"`)) {
                return conn.sendMessage(m.chat, { document: Buffer.from(content), fileName: file, mimetype: 'text/javascript' }, { quoted: m });
            }
        }
        m.reply("❌ Command file not found.");
    }
});

// Group Cache Inspector
addCommand({
    pattern: 'cachedmeta',
    category: 'owner',
    desc: 'View cached group metadata',
    handler: async (m, { text, isOwner }) => {
        if (!isOwner) return m.reply(global.messages.owner);
        const target = text || m.chat;
        const meta = groupCache.get(target);
        if (!meta) return m.reply("❌ No cache for this JID");
        m.reply(`📋 *Cached Meta:*\n\n${util.inspect(meta)}`);
    }
});


/**
 * PROFILE PICTURES
 */
addCommand({
    pattern: 'gcpp',
    alias: ['setgcpp', 'gcfullpp'],
    category: 'group',
    desc: 'Set group full profile picture',
    handler: async (m, { conn, isGroup, isAdmin, isBotAdmin }) => {
        if (!isGroup) return m.reply(global.messages.group);
        if (!isAdmin) return m.reply(global.messages.admin);
        if (!isBotAdmin) return m.reply(global.messages.botAdmin);

        const quoted = m.quoted ? m.quoted : m;
        const mime = (quoted.msg || quoted).mimetype || '';
        if (!/image/.test(mime)) return m.reply("❌ Quote an image.");

        try {
            const img = await quoted.download();
            const { img: processedImg } = await generateProfilePicture(img);

            await conn.query({
                tag: 'iq',
                attrs: { to: m.chat, type: 'set', xmlns: 'w:profile:picture' },
                content: [{ tag: 'picture', attrs: { type: 'image' }, content: processedImg }]
            });
            m.reply("✅ Group PP updated.");
        } catch (e) {
            console.error(e);
            m.reply("❌ Failed to update PP.");
        }
    }
});

addCommand({
    pattern: 'fullpp',
    alias: ['setfullpp'],
    category: 'owner',
    desc: 'Set bot full profile picture',
    handler: async (m, { conn, isOwner }) => {
        if (!isOwner) return m.reply(global.messages.owner);
        const quoted = m.quoted ? m.quoted : m;
        const mime = (quoted.msg || quoted).mimetype || '';
        if (!/image/.test(mime)) return m.reply("❌ Quote an image.");

        try {
            const img = await quoted.download();
            const { img: processedImg } = await generateProfilePicture(img);

            await conn.query({
                tag: 'iq',
                attrs: { to: S_WHATSAPP_NET, type: 'set', xmlns: 'w:profile:picture' },
                content: [{ tag: 'picture', attrs: { type: 'image' }, content: processedImg }]
            });
            m.reply("✅ Bot PP updated.");
        } catch (e) {
            console.error(e);
            m.reply("❌ Failed to update PP.");
        }
    }
});

// Helper for Full PP
async function generateProfilePicture(buffer) {
    const jimp = await Jimp.read(buffer);
    const min = jimp.getWidth();
    const max = jimp.getHeight();
    const cropped = jimp.crop(0, 0, min, max);
    return {
        img: await cropped.scaleToFit(720, 720).getBufferAsync(Jimp.MIME_JPEG),
        preview: await cropped.normalize().getBufferAsync(Jimp.MIME_JPEG)
    };
}


/**
 * VIEW ONCE
 */
addCommand({
    pattern: 'vv',
    alias: ['reveal'],
    category: 'owner',
    desc: 'Reveal ViewOnce',
    handler: async (m, { conn, isOwner }) => {
        if (!isOwner) return m.reply(global.messages.owner);
        if (!m.quoted) return m.reply("❌ Quote a ViewOnce message");

        const q = m.quoted.msg || m.quoted;
        if (!q.viewOnce) return m.reply("❌ Not a ViewOnce message");

        // Baileys automatically handles ViewOnce decoding often, 
        // but if we need to force it, we rely on the buffer download
        try {
            const buffer = await m.quoted.download();
            const caps = q.caption || "";

            if (/image/.test(q.mimetype)) {
                await conn.sendMessage(m.chat, { image: buffer, caption: caps });
            } else if (/video/.test(q.mimetype)) {
                await conn.sendMessage(m.chat, { video: buffer, caption: caps });
            } else if (/audio/.test(q.mimetype)) {
                await conn.sendMessage(m.chat, { audio: buffer, ptt: q.ptt });
            }
        } catch (e) {
            m.reply("❌ Failed to reveal.");
        }
    }
});

/**
 * DISAPPEARING MESSAGES
 */
addCommand({
    pattern: 'disapp',
    category: 'group',
    desc: 'Set disappearing messages',
    handler: async (m, { text, conn, isGroup, isAdmin, isOwner }) => {
        if (!isGroup) return m.reply(global.messages.group);
        if (!isAdmin && !isOwner) return m.reply(global.messages.admin);

        let seconds = 0;
        if (text === 'on') seconds = 86400; // 24h
        else if (text === 'off') seconds = 0;
        else if (text === '7') seconds = 7 * 86400;
        else if (text === '90') seconds = 90 * 86400;
        else return m.reply("❌ Options: on, off, 7, 90");

        await conn.sendMessage(m.chat, { disappearingMessagesInChat: seconds });
        m.reply(`✅ Disappearing messages: *${text}*`);
    }
});

/**
 * JOIN GROUP
 */
addCommand({
    pattern: 'join',
    category: 'owner',
    desc: 'Join group by link',
    handler: async (m, { text, conn, isOwner }) => {
        if (!isOwner) return m.reply(global.messages.owner);
        if (!text) return m.reply("❌ Link required");

        const code = text.split('chat.whatsapp.com/')[1];
        if (!code) return m.reply("❌ Invalid link");

        try {
            const res = await conn.groupAcceptInvite(code);
            m.reply(`✅ Joined group: ${res}`);
        } catch (e) {
            m.reply(`❌ Failed: ${e.message}`);
        }
    }
});

/**
 * BLOCK/UNBLOCK
 */
addCommand({
    pattern: 'block',
    category: 'owner',
    desc: 'Block user',
    handler: async (m, { text, conn, isOwner }) => {
        if (!isOwner) return m.reply(global.messages.owner);
        const user = m.quoted ? m.quoted.sender : text ? text.replace(/\D/g, "") + "@s.whatsapp.net" : null;
        if (!user) return m.reply("❌ User required");

        await conn.updateBlockStatus(user, "block");
        m.reply(`✅ Blocked @${user.split('@')[0]}`, { mentions: [user] });
    }
});

addCommand({
    pattern: 'unblock',
    category: 'owner',
    desc: 'Unblock user',
    handler: async (m, { text, conn, isOwner }) => {
        if (!isOwner) return m.reply(global.messages.owner);
        const user = m.quoted ? m.quoted.sender : text ? text.replace(/\D/g, "") + "@s.whatsapp.net" : null;
        if (!user) return m.reply("❌ User required");

        await conn.updateBlockStatus(user, "unblock");
        m.reply(`✅ Unblocked @${user.split('@')[0]}`, { mentions: [user] });
    }
});

/**
 * SAVE QUOTED MESSAGE
 */
addCommand({
    pattern: 'save',
    alias: ['sv', 'grab'],
    react: '💾',
    category: 'owner',
    desc: 'Save quoted message to DM',
    handler: async (m, { conn, isOwner, quoted }) => {
        if (!isOwner) return m.reply(global.messages.owner);
        if (!quoted) return m.reply("❌ Reply to a message.");

        try {
            await conn.sendMessage(m.sender, { forward: quoted.msg }, { quoted: m });
            // Alternatively if forward fails for some types, manual copy:
            // const buffer = await quoted.download();
            // ... (but forward is usually sufficient for internal 'save')
            // User requested robust save, let's try the media download approach if forward is too simple
            // But forward is most reliable for preserving type.
            m.react('✅');
        } catch (e) {
            // Fallback content save
            const msg = quoted.msg || quoted;
            if (msg.text || msg.caption) {
                await conn.sendMessage(m.sender, { text: msg.text || msg.caption });
                m.react('✅');
            } else {
                m.reply("❌ Could not forward.");
            }
        }
    }
});

/**
 * RETURN RAW JSON
 */
addCommand({
    pattern: 'return',
    alias: ['json', 'debug'],
    react: '🔍',
    category: 'owner',
    desc: 'Get raw message JSON',
    handler: async (m, { conn, isOwner, quoted }) => {
        if (!isOwner) return m.reply(global.messages.owner);
        if (!quoted) return m.reply("❌ Reply to a message.");

        const json = JSON.stringify(quoted, null, 2);
        if (json.length > 4000) {
            await conn.sendMessage(m.chat, { document: Buffer.from(json), fileName: 'message.json', mimetype: 'application/json' }, { quoted: m });
        } else {
            m.reply('```' + json + '```');
        }
    }
});
