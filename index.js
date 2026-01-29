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
    getContentType
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

// Dynamic Plugin Loader
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

// Railway keep-alive
keepAlive();

const startMantra = async () => {
    await loadPlugins();
    await validateSession(global.sessionId, sessionDir);

    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    const { version } = await fetchLatestBaileysVersion();

    const conn = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: true,
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

    // FIX: Connection Logic to prevent triple-sending
    conn.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;

        if (update.qr) {
            console.log(chalk.yellow("⚠️ [MANTRA] QR Code received."));
        }

        if (connection === 'close') {
            const reason = lastDisconnect?.error?.output?.statusCode;
            console.log(chalk.red(`📡 [CONNECTION] Closed. Reason: ${reason}`));

            if (reason === DisconnectReason.loggedOut) {
                console.log(chalk.red("💀 [MANTRA] Session logged out. Exit."));
                process.exit(1);
            } else {
                // Exponential backoff or simple delay to prevent rapid restart loops
                setTimeout(() => startMantra(), 5000);
            }
        } else if (connection === 'open') {
            console.log(chalk.green(`✨ [MANTRA] SUCCESS: Bot is online!`));

            // Fix triple-send: Only send if this is the first "open" event for this instance
            if (!conn.onlineMessageSent) {
                const ownerJid = global.owner[0] + "@s.whatsapp.net";
                await conn.sendMessage(ownerJid, {
                    text: `🔮 *MANTRA SYSTEM ONLINE*\n\nUser: ${global.author}\nStatus: Cloud Stabilized 🛡️`
                });
                conn.onlineMessageSent = true;
            }
        }
    });

    conn.ev.on('creds.update', saveCreds);

    conn.ev.on('messages.upsert', async chatUpdate => {
        try {
            let m = chatUpdate.messages[0];
            if (!m.message) return;

            // Handle Ephemeral messages before smsg
            if (m.message.ephemeralMessage) {
                m.message = m.message.ephemeralMessage.message;
            }

            m = smsg(conn, m, store);
            if (!m.message || m.key.fromMe) return;

            // --- Robust Body Extraction ---
            const mtype = getContentType(m.message);
            const content = m.message[mtype];

            // Extract body for command parsing, including ViewOnce captions
            let body = '';
            if (mtype === 'conversation') body = content;
            else if (mtype === 'extendedTextMessage') body = content.text;
            else if (mtype === 'imageMessage' || mtype === 'videoMessage') body = content.caption;
            else if (mtype === 'viewOnceMessage' || mtype === 'viewOnceMessageV2') {
                const viewOnceInner = content.message;
                const innerType = getContentType(viewOnceInner);
                body = viewOnceInner[innerType].caption || '';
            }

            const isCmd = body.startsWith(global.prefix);
            const command = isCmd ? body.slice(global.prefix.length).trim().split(' ').shift().toLowerCase() : '';
            const args = body.trim().split(/ +/).slice(1);
            const text = args.join(" ");
            const sender = m.sender;
            const isGroup = m.isGroup;

            // Cache group details
            const groupMetadata = isGroup ? await conn.groupMetadata(m.chat) : '';
            const groupAdmins = isGroup ? groupMetadata.participants.filter(p => p.admin).map(p => p.id) : [];
            const isOwner = global.owner.includes(sender.split('@')[0]);
            const isUserAdmin = groupAdmins.includes(sender);
            const isBotAdmin = groupAdmins.includes(conn.user.id.split(':')[0] + '@s.whatsapp.net');

            // --- Anti-Link Monitor ---
            if (isGroup && isAntilinkOn(m.chat) && !isOwner && !isUserAdmin && isBotAdmin) {
                const linkRegex = /chat.whatsapp.com\/(?:invite\/)?([0-9A-Za-z]{20,24})/i;
                if (linkRegex.test(body)) {
                    await conn.sendMessage(m.chat, { delete: m.key });
                    await conn.groupParticipantsUpdate(m.chat, [sender], 'remove');
                    return;
                }
            }

            // --- Command Execution ---
            if (isCmd && commands[command]) {
                console.log(chalk.yellow(`[CMD]`), chalk.green(command), `from`, chalk.cyan(sender));
                await commands[command].handler(m, {
                    conn, args, text, isOwner, isGroup, groupMetadata, isUserAdmin, isBotAdmin
                });
            }
        } catch (err) {
            console.error("Upsert Error:", err);
        }
    });
};

// Global Error Prevention
process.on('uncaughtException', (err) => console.error('🚨 UNCAUGHT:', err));
process.on('unhandledRejection', (reason) => console.error('🚨 UNHANDLED:', reason));

startMantra();