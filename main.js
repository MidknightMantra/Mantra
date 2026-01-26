require('./config');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, makeInMemoryStore } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');

// Simple in-memory store (optional, for message history)
const store = makeInMemoryStore({ logger: pino().child({ level: 'silent', stream: 'store' }) });

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('session_auth');

    const sock = makeWASocket({
        logger: pino({ level: 'silent' }), // Keep it quiet and fast
        printQRInTerminal: true,
        auth: state,
        browser: ['MidKnight-Core', 'Safari', '1.0.0'], // "Fake" browser signature
        syncFullHistory: false, // Make it lightweight: don't sync years of history
        generateHighQualityLinkPreview: true,
    });

    store.bind(sock.ev);

    // 1. Connection Logic
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            let reason = lastDisconnect.error?.output?.statusCode;
            if (reason !== DisconnectReason.loggedOut) {
                connectToWhatsApp(); // Reconnect automatically
            } else {
                console.log('Logged out. Delete session_auth and scan again.');
            }
        } else if (connection === 'open') {
            console.log('[MIDKNIGHT] Connected securely.');
        }
    });

    sock.ev.on('creds.update', saveCreds);

    // 2. The "Hot Reload" Message Handler
    sock.ev.on('messages.upsert', async chatUpdate => {
        try {
            let m = chatUpdate.messages[0];
            if (!m.message) return;
            
            // Minimal processing to handle "me" vs "sender"
            const from = m.key.remoteJid;
            const isMe = m.key.fromMe;

            // DANGEROUSLY EFFECTIVE: Clear cache for handler every message
            // This lets you edit 'handler.js' live.
            const handlerPath = './handler.js';
            if (fs.existsSync(handlerPath)) {
                 delete require.cache[require.resolve(handlerPath)];
            }
            
            // Pass the socket and message to the handler
            require(handlerPath)(sock, m, chatUpdate);

        } catch (err) {
            console.log(err);
        }
    });
}

connectToWhatsApp();
