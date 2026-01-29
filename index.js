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
import { isAntilinkOn, isSudoMode } from './lib/database.js';

// Make sudo checker globally available
global.isSudoMode = isSudoMode;

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
    console.log(chalk.green(`✅ Registered ${Object.keys(commands).length} commands:`, Object.keys(commands).slice(0, 10).join(', ')));
}

const store = makeInMemoryStore({
    logger: pino().child({ level: 'silent', stream: 'store' })
});

// Read store from file on startup (persists messages)
if (fs.existsSync('./store.json')) {
    store.readFromFile('./store.json');
}

// Save store to file every 30 seconds (prevents data loss)
setInterval(() => {
    store.writeToFile('./store.json');
}, 30000);

const sessionDir = './session';

// Railway keep-alive
keepAlive();

const startMantra = async () => {
    await loadPlugins();
    await validateSession(global.sessionId, sessionDir);

    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    const { version } = await fetchLatestBaileysVersion();

    const conn = makeWASocket({
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

    // CRITICAL: Write store immediately when messages are received (for anti-delete)
    conn.ev.on('messages.upsert', () => {
        store.writeToFile('./store.json').catch(e => console.error('Store write error:', e));
    });

    conn.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;

        if (update.qr) {
            console.log(chalk.yellow("⚠️ [MANTRA] QR Code received."));
        }

        if (connection === 'close') {
            const reason = lastDisconnect?.error?.output?.statusCode;
            console.log(chalk.red(`📡 [CONNECTION] Closed. Reason: ${reason}`));

            if (reason === DisconnectReason.loggedOut) {
                console.log(chalk.red("💀 [MANTRA] Session logged out. Please clear session and reconnect."));
                process.exit(1);
            } else {
                console.log(chalk.blue("🔄 [MANTRA] Reconnecting..."));
                setTimeout(() => startMantra(), 5000);
            }
        } else if (connection === 'open') {
            console.log(chalk.green(`✨ [MANTRA] SUCCESS: Bot is online!`));

            // Send online notification (non-blocking)
            if (!conn.onlineMessageSent) {
                try {
                    const ownerJid = global.owner[0] + "@s.whatsapp.net";
                    await conn.sendMessage(ownerJid, {
                        text: `🔮 *MANTRA SYSTEM ONLINE*\n\nUser: ${global.author}\nStatus: Cloud Stabilized 🛡️`
                    });
                    conn.onlineMessageSent = true;
                } catch (e) {
                    console.log(chalk.yellow('⚠️ Could not send online notification to owner (timeout/network issue)'));
                }
            }

            // ALWAYS ONLINE: Send presence updates every 30 seconds
            if (conn.presenceInterval) clearInterval(conn.presenceInterval);

            conn.presenceInterval = setInterval(async () => {
                try {
                    await conn.sendPresenceUpdate('available');
                    console.log(chalk.hex('#6A0DAD')('📡 Presence: Online'));
                } catch (e) {
                    console.error('Presence update error:', e.message);
                }
            }, 30000); // Every 30 seconds

            // Send initial presence immediately
            try {
                await conn.sendPresenceUpdate('available');
                console.log(chalk.green('✅ Always-Online mode activated'));
            } catch (e) {
                console.error('Initial presence error:', e.message);
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

            // Allow owner's own messages if sudo mode is enabled, otherwise skip fromMe
            const sudoMode = global.isSudoMode ? global.isSudoMode() : false;
            if (!m.message || (m.key.fromMe && !sudoMode)) return;

            // --- Robust Body Extraction ---
            const mtype = getContentType(m.message);
            const content = m.message[mtype];

            // Extract body for command parsing, including ViewOnce captions
            let body = '';
            if (mtype === 'conversation') {
                body = m.message.conversation;
            } else if (mtype === 'imageMessage' || mtype === 'videoMessage') {
                body = content.caption || '';
            } else if (mtype === 'extendedTextMessage') {
                body = content.text || '';
            } else if (mtype === 'viewOnceMessageV2' || mtype === 'viewOnceMessage') {
                const innerType = Object.keys(content.message)[0];
                body = content.message[innerType]?.caption || '';
            } else if (mtype === 'listResponseMessage') {
                body = content.singleSelectReply?.selectedRowId || '';
            } else if (mtype === 'buttonsResponseMessage') {
                body = content.selectedButtonId || '';
            }

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

            // 2. Anti-Link Monitor
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
            if (isCmd) {
                console.log(chalk.cyan(`[DEBUG] Received command:"${command}" from ${sender.split('@')[0]}. Body:"${body.substring(0, 50)}"`));
                console.log(chalk.cyan(`[DEBUG] Commands available:`, Object.keys(commands).length));

                if (commands[command]) {
                    console.log(chalk.green(`[CMD] Executing: ${command}`));
                    await commands[command].handler(m, { conn, args, text, isOwner, isGroup, groupMetadata, isUserAdmin, isBotAdmin });
                } else {
                    console.log(chalk.yellow(`[WARN] Command "${command}" not found in registry`));
                }
            }
        } catch (err) {
            console.error('Upsert Error:', err);
        }
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