import { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeInMemoryStore } from '@whiskeysockets/baileys';
import pino from 'pino';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 1. Configuration & Utilities
import './config.js';
import { smsg } from './lib/utils.js';
import { validateSession } from './lib/session.js';
import { initListeners } from './lib/listeners.js';
import { keepAlive } from './lib/alive.js';

// 2. Load Plugins
import './plugins/_system.js';
import './plugins/_menu.js';
import './plugins/media.js';
import './plugins/group.js';
import './plugins/download.js';
import './plugins/save.js';
import './plugins/vv.js';
import { commands } from './lib/plugins.js';

// 3. Initialize Global Components
const store = makeInMemoryStore({ logger: pino().child({ level: 'silent', stream: 'store' }) });
const sessionDir = './session';
const usePairingCode = true; // Set to FALSE if you want QR Code

// 4. Start Keep-Alive Server (For Cloud Deployments)
keepAlive();

const startMantra = async () => {

    // 🟢 Attempt to restore session from ENV (SESSION_ID)
    await validateSession(global.sessionId, sessionDir);

    // 🟢 Auth Strategy
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    const { version } = await fetchLatestBaileysVersion();

    console.log(chalk.hex('#6A0DAD')(`🔮 Mantra-MD Starting... (v${version.join('.')})`));

    // 🟢 Socket Config
    const conn = makeWASocket({
        logger: pino({ level: 'silent' }),
        printQRInTerminal: !usePairingCode, // Only show QR if Pairing Code is OFF
        browser: ['Mantra-OS', 'Chrome', '1.0.0'],
        auth: state,
        generateHighQualityLinkPreview: true,
        syncFullHistory: true, // Required for Anti-Delete to work well
        getMessage: async (key) => {
            if (store) {
                const msg = await store.loadMessage(key.remoteJid, key.id);
                return msg.message || undefined;
            }
            return { conversation: "Message not found" };
        }
    });

    // 🟢 Pairing Code Logic
    if (usePairingCode && !conn.authState.creds.registered) {
        setTimeout(async () => {
            try {
                let phoneNumber = global.pairingNumber.replace(/[^0-9]/g, '');

                if (!phoneNumber) {
                    console.log(chalk.red("⚠️ global.pairingNumber is missing in config.js!"));
                    return;
                }

                let code = await conn.requestPairingCode(phoneNumber);
                code = code?.match(/.{1,4}/g)?.join("-") || code;
                console.log(chalk.black(chalk.bgHex('#6A0DAD')(` 🔮 PAIRING CODE: `)), chalk.bold.white(code));
            } catch (err) {
                console.error("❌ Error requesting pairing code:", err);
            }
        }, 4000); // Wait 4s for connection
    }

    // 🟢 Bind Store & Background Listeners
    store.bind(conn.ev);
    await initListeners(conn, store);

    // 🟢 Connection Updates
    conn.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === 'close') {
            let reason = lastDisconnect.error?.output?.statusCode;

            if (reason === DisconnectReason.badSession) {
                console.log("💀 Bad Session. Please delete 'session' folder and rescan.");
                process.exit();
            }
            else if (reason === DisconnectReason.connectionClosed) { startMantra(); }
            else if (reason === DisconnectReason.connectionLost) { startMantra(); }
            else if (reason === DisconnectReason.loggedOut) {
                console.log("💀 Device Logged Out. Delete session and rescan.");
                process.exit();
            }
            else if (reason === DisconnectReason.restartRequired) { startMantra(); }
            else { startMantra(); }

        } else if (connection === 'open') {
            console.log(chalk.green(`🔮 Connected! Mantra-MD is online.`));

            // Notify Owner
            const ownerJid = global.owner[0] + "@s.whatsapp.net";
            conn.sendMessage(ownerJid, { text: `🔮 *MANTRA SYSTEM ONLINE*\n\nMode: ${global.botName}\nUser: ${global.author}` });
        }
    });

    // 🟢 Credential Updates
    conn.ev.on('creds.update', saveCreds);

    // 🟢 Message Handler
    conn.ev.on('messages.upsert', async chatUpdate => {
        try {
            let m = chatUpdate.messages[0];
            if (!m.message) return;

            m.message = (Object.keys(m.message)[0] === 'ephemeralMessage') ? m.message.ephemeralMessage.message : m.message;
            if (m.key && m.key.remoteJid === 'status@broadcast') return;

            // Serialize
            m = smsg(conn, m, store);
            if (!m.message) return;

            // Variables
            const body = (m.mtype === 'conversation') ? m.message.conversation :
                (m.mtype == 'imageMessage') ? m.message.imageMessage.caption :
                    (m.mtype == 'videoMessage') ? m.message.videoMessage.caption :
                        (m.mtype == 'extendedTextMessage') ? m.message.extendedTextMessage.text : '';

            const isCmd = body.startsWith(global.prefix);
            const command = isCmd ? body.slice(global.prefix.length).trim().split(' ').shift().toLowerCase() : '';
            const args = body.trim().split(/ +/).slice(1);
            const text = args.join(" ");
            const sender = m.sender;
            const isGroup = m.isGroup;
            const groupMetadata = isGroup ? await conn.groupMetadata(m.chat) : '';
            const isOwner = global.owner.includes(sender.split('@')[0]);

            // Log
            if (isCmd) console.log(chalk.yellow(`[CMD]`), chalk.green(command), 'from', chalk.blue(sender.split('@')[0]));

            // Execute
            if (isCmd && commands[command]) {
                try {
                    await commands[command].handler(m, { conn, args, text, isOwner, isGroup, groupMetadata });
                } catch (e) {
                    console.error(e);
                    m.reply(`${global.emojis.error} Error: ${e.message}`);
                }
            }
        } catch (err) {
            console.log(err);
        }
    });
};

// 🟢 Start
startMantra();