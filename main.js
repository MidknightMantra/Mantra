require('dotenv').config(); // Load .env file
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const { smsg } = require('./lib/simple');
const { setupSession, SESSION_DIR } = require('./auth');

// Initialize Auth
setupSession();

async function startMantra() {
    // Load auth state from the folder (which was just populated if ID existed)
    const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);

    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        printQRInTerminal: true,
        auth: state,
        syncFullHistory: false // Keep it lightweight
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('[MANTRA] Connection closed. Reconnecting?', shouldReconnect);
            if (shouldReconnect) startMantra();
        } else if (connection === 'open') {
            console.log('[MANTRA] 🟢 Online');
        }
    });

    sock.ev.on('creds.update', saveCreds);

    // Message Handler
    sock.ev.on('messages.upsert', async chatUpdate => {
        try {
            let m = chatUpdate.messages[0];
            if (!m.message) return;
            
            // SIMPLIFY THE MESSAGE (The Magic Step)
            m = smsg(sock, m);

            // Ignore status updates and self-messages
            if (m.key.remoteJid === 'status@broadcast') return;
            if (!m.text) return;

            // Clear cache for handler to allow HOT RELOADING
            const handlerPath = './handler.js';
            if (fs.existsSync(handlerPath)) {
                 delete require.cache[require.resolve(handlerPath)];
            }
            
            // Pass execution to the brain
            require(handlerPath)(sock, m);

        } catch (err) {
            console.error(err);
        }
    });
}

startMantra();
