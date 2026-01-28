import { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeInMemoryStore } from '@whiskeysockets/baileys';
import pino from 'pino';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 1. Config & Libs
import './config.js';
import { smsg } from './lib/utils.js';
import { validateSession } from './lib/session.js';
import { initListeners } from './lib/listeners.js';
import { keepAlive } from './lib/alive.js';
import { commands } from './lib/plugins.js';

// 2. Dynamic Plugin Loader Logic
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function loadPlugins() {
    const pluginFolder = path.join(__dirname, 'plugins');
    const files = fs.readdirSync(pluginFolder).filter(file => file.endsWith('.js'));

    console.log(chalk.hex('#6A0DAD')(`🔮 Loading ${files.length} plugins...`));

    for (const file of files) {
        try {
            await import(`file://${path.join(pluginFolder, file)}`);
        } catch (e) {
            console.error(chalk.red(`❌ Failed to load plugin ${file}:`, e));
        }
    }
    console.log(chalk.green(`✅ Plugins loaded successfully.`));
}

// 3. Init Global Components
const store = makeInMemoryStore({ logger: pino().child({ level: 'silent', stream: 'store' }) });
const sessionDir = './session';
const usePairingCode = true;

keepAlive();

const startMantra = async () => {

    await loadPlugins(); // <--- LOAD PLUGINS HERE
    await validateSession(global.sessionId, sessionDir);

    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    const { version } = await fetchLatestBaileysVersion();

    console.log(chalk.hex('#6A0DAD')(`🔮 Mantra-MD Starting... (v${version.join('.')})`));

    const conn = makeWASocket({
        logger: pino({ level: 'silent' }),
        printQRInTerminal: !usePairingCode,
        browser: ['Mantra-OS', 'Chrome', '1.0.0'],
        auth: state,
        generateHighQualityLinkPreview: true,
        syncFullHistory: true,
        getMessage: async (key) => {
            if (store) {
                const msg = await store.loadMessage(key.remoteJid, key.id);
                return msg.message || undefined;
            }
            return { conversation: "Message not found" };
        }
    });

    if (usePairingCode && !conn.authState.creds.registered) {
        setTimeout(async () => {
            try {
                let phoneNumber = global.pairingNumber.replace(/[^0-9]/g, '');
                if (!phoneNumber) return console.log(chalk.red("⚠️ global.pairingNumber is missing!"));
                let code = await conn.requestPairingCode(phoneNumber);
                code = code?.match(/.{1,4}/g)?.join("-") || code;
                console.log(chalk.black(chalk.bgHex('#6A0DAD')(` 🔮 PAIRING CODE: `)), chalk.bold.white(code));
            } catch (err) { console.error("❌ Error requesting pairing code:", err); }
        }, 4000);
    }

    store.bind(conn.ev);
    await initListeners(conn, store);

    conn.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            let reason = lastDisconnect.error?.output?.statusCode;
            if (reason === DisconnectReason.badSession) { console.log("💀 Bad Session."); process.exit(); }
            else if (reason === DisconnectReason.connectionClosed) { startMantra(); }
            else if (reason === DisconnectReason.connectionLost) { startMantra(); }
            else if (reason === DisconnectReason.loggedOut) { console.log("💀 Logged Out."); process.exit(); }
            else if (reason === DisconnectReason.restartRequired) { startMantra(); }
            else { startMantra(); }
        } else if (connection === 'open') {
            console.log(chalk.green(`🔮 Connected! Mantra-MD is online.`));
            const ownerJid = global.owner[0] + "@s.whatsapp.net";
            conn.sendMessage(ownerJid, { text: `🔮 *MANTRA SYSTEM ONLINE*\n\nMode: ${global.botName}\nUser: ${global.author}` });
        }
    });

    conn.ev.on('creds.update', saveCreds);

    conn.ev.on('messages.upsert', async chatUpdate => {
        try {
            let m = chatUpdate.messages[0];
            if (!m.message) return;
            m.message = (Object.keys(m.message)[0] === 'ephemeralMessage') ? m.message.ephemeralMessage.message : m.message;
            if (m.key && m.key.remoteJid === 'status@broadcast') return;
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
            const isOwner = global.owner.includes(sender.split('@')[0]);

            if (isCmd) console.log(chalk.yellow(`[CMD]`), chalk.green(command));

            if (isCmd && commands[command]) {
                await commands[command].handler(m, { conn, args, text, isOwner, isGroup, groupMetadata });
            }
        } catch (err) { console.log(err); }
    });
};

startMantra();