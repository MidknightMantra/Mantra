console.log("-----------------------------------------");
console.log("🔮 [MANTRA] INITIALIZING CORE SYSTEM...");
console.log("-----------------------------------------");

import pkg from '@whiskeysockets/baileys';
const {
    makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeInMemoryStore,
    getContentType // Extracted from pkg to avoid ESM named export errors
} = pkg;

import pino from 'pino';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 1. Config & Core Modules
import './config.js';
import { smsg } from './lib/utils.js';
import { validateSession } from './lib/session.js';
import { initListeners } from './lib/listeners.js';
import { keepAlive } from './lib/alive.js';
import { commands } from './lib/plugins.js';
import { isAntilinkOn } from './lib/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 2. Dynamic Plugin Loader
async function loadPlugins() {
    const pluginFolder = path.join(__dirname, 'plugins');
    const files = fs.readdirSync(pluginFolder).filter(file => file.endsWith('.js'));
    console.log(chalk.hex('#6A0DAD')(`🔮 Loading ${files.length} plugins...`));
    for (const file of files) {
        try {
            await import(`file://${path.join(pluginFolder, file)}`);
        } catch (e) {
            console.error(chalk.red(`❌ Failed to load ${file}:`, e));
        }
    }
}

const store = makeInMemoryStore({ logger: pino().child({ level: 'silent', stream: 'store' }) });
const sessionDir = './session';

// Start the fake web server for Railway
keepAlive();

const startMantra = async () => {
    await loadPlugins();
    await validateSession(global.sessionId, sessionDir);

    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    const { version } = await fetchLatestBaileysVersion();

    const conn = makeWASocket({
        logger: pino({ level: 'silent' }),
        printQRInTerminal: true, // Set to false if using pairing code
        browser: ['Mantra-MD', 'Chrome', '1.0.0'],
        auth: state,
        getMessage: async (key) => {
            if (store) {
                const msg = await store.loadMessage(key.remoteJid, key.id);
                return msg?.message || undefined;
            }
            return { conversation: "Not Found" };
        }
    });

    store.bind(conn.ev);
    await initListeners(conn, store);

    conn.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            let reason = lastDisconnect.error?.output?.statusCode;
            if (reason === DisconnectReason.loggedOut) {
                console.log(chalk.red("💀 Logged Out. Delete session and restart."));
                process.exit();
            } else {
                startMantra();
            }
        } else if (connection === 'open') {
            console.log(chalk.green(`🔮 Connected! Mantra-MD is online.`));
            const ownerJid = global.owner[0] + "@s.whatsapp.net";
            conn.sendMessage(ownerJid, { text: `🔮 *MANTRA SYSTEM ONLINE*\n\nUser: ${global.author}` });
        }
    });

    conn.ev.on('creds.update', saveCreds);

    conn.ev.on('messages.upsert', async chatUpdate => {
        try {
            let m = chatUpdate.messages[0];
            if (!m.message) return;
            m.message = (Object.keys(m.message)[0] === 'ephemeralMessage') ? m.message.ephemeralMessage.message : m.message;

            // 1. Auto Read Status
            if (m.key && m.key.remoteJid === 'status@broadcast') {
                await conn.readMessages([m.key]);
                return;
            }

            m = smsg(conn, m, store);
            if (!m.message) return;

            const body = (m.mtype === 'conversation') ? m.message.conversation : (m.mtype == 'imageMessage') ? m.message.imageMessage.caption : (m.mtype == 'videoMessage') ? m.message.videoMessage.caption : (m.mtype == 'extendedTextMessage') ? m.message.extendedTextMessage.text : '';

            const isCmd = body.startsWith(global.prefix);
            const command = isCmd ? body.slice(global.prefix.length).trim().split(' ').shift().toLowerCase() : '';
            const args = body.trim().split(/ +/).slice(1);
            const text = args.join(" ");
            const sender = m.sender;
            const isGroup = m.isGroup;

            const groupMetadata = isGroup ? await conn.groupMetadata(m.chat) : '';
            const groupAdmins = isGroup ? groupMetadata.participants.filter(p => p.admin).map(p => p.id) : [];
            const isOwner = global.owner.includes(sender.split('@')[0]);
            const isUserAdmin = groupAdmins.includes(sender);
            const isBotAdmin = groupAdmins.includes(conn.user.id.split(':')[0] + '@s.whatsapp.net');

            // 2. Anti-Link Monitor (Applied before command check)
            if (isGroup && isAntilinkOn(m.chat) && !isOwner && !isUserAdmin && isBotAdmin) {
                const linkRegex = /chat.whatsapp.com\/(?:invite\/)?([0-9A-Za-z]{20,24})/i;
                if (linkRegex.test(body)) {
                    await conn.sendMessage(m.chat, { delete: m.key });
                    await conn.groupParticipantsUpdate(m.chat, [sender], 'remove');
                    return conn.sendMessage(m.chat, {
                        text: `🚫 *Anti-Link:* @${sender.split('@')[0]} was removed for sending a group link.`,
                        mentions: [sender]
                    });
                }
            }

            // 3. Command Execution
            if (isCmd && commands[command]) {
                console.log(chalk.yellow(`[CMD]`), chalk.green(command), `from`, chalk.cyan(sender));
                await commands[command].handler(m, { conn, args, text, isOwner, isGroup, groupMetadata, isUserAdmin, isBotAdmin });
            }
        } catch (err) { console.error(err); }
    });
};

/** 
 * ERROR HANDLING - Ensures the bot doesn't crash on Railway
 */
process.on('uncaughtException', (err) => {
    console.error('🚨 UNCAUGHT EXCEPTION:', err);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('🚨 UNHANDLED REJECTION:', reason);
});

startMantra();