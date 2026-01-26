const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const path = require('path');
const { smsg } = require('./lib/simple');
const config = require('./config');

// Global plugin container
global.plugins = new Map();

// --- 1. SESSION RESTORATION LOGIC ---
async function handleSession() {
    if (!fs.existsSync('./auth_info_baileys') && config.SESSION_ID.startsWith('Mantra~')) {
        console.log('Found Mantra Session ID, restoring...');
        const sessionData = config.SESSION_ID.replace("Mantra~", "");
        // Assuming the ID is a base64 encoded JSON of creds
        const buff = Buffer.from(sessionData, 'base64');
        const json = JSON.parse(buff.toString('utf-8'));
        fs.mkdirSync('./auth_info_baileys', { recursive: true });
        fs.writeFileSync('./auth_info_baileys/creds.json', JSON.stringify(json, null, 2));
    }
}

// --- 2. PLUGIN LOADER (HOT RELOAD) ---
const readPlugins = () => {
    const dir = path.join(__dirname, 'plugins');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    
    fs.readdirSync(dir).forEach(file => {
        if (file.endsWith('.js')) {
            try {
                const plugin = require(path.join(dir, file));
                global.plugins.set(file, plugin);
                console.log(`Loaded plugin: ${file}`);
            } catch (e) {
                console.error(`Failed to load ${file}:`, e);
            }
        }
    });
};

// Watch for changes in plugins folder
fs.watch(path.join(__dirname, 'plugins'), (eventType, filename) => {
    if (filename && filename.endsWith('.js')) {
        const fullPath = path.join(__dirname, 'plugins', filename);
        if (fs.existsSync(fullPath)) {
            console.log(`Plugin updated: ${filename} - Reloading...`);
            delete require.cache[require.resolve(fullPath)];
            const plugin = require(fullPath);
            global.plugins.set(filename, plugin);
        }
    }
});

// --- 3. MAIN CONNECTION ---
async function startMantra() {
    await handleSession();
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    
    const conn = makeWASocket({
        logger: pino({ level: 'silent' }),
        printQRInTerminal: true,
        auth: state,
        browser: ['Mantra', 'Safari', '1.0.0']
    });

    conn.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startMantra();
        } else if (connection === 'open') {
            console.log('Mantra is Online');
        }
    });

    conn.ev.on('creds.update', saveCreds);

    // Initial Plugin Load
    readPlugins();

    conn.ev.on('messages.upsert', async chatUpdate => {
        try {
            let m = chatUpdate.messages[0];
            if (!m.message) return;
            m.message = (Object.keys(m.message)[0] === 'ephemeralMessage') ? m.message.ephemeralMessage.message : m.message;
            if (m.key && m.key.remoteJid === 'status@broadcast') return;
            
            // Serialize message using helper
            m = smsg(conn, m); 

            const cmd = m.body.startsWith(config.PREFIX) ? m.body.slice(1).split(' ')[0].toLowerCase() : '';
            const args = m.body.trim().split(/ +/).slice(1);
            const text = args.join(" ");

            // Command Handler
            global.plugins.forEach((plugin) => {
                if (plugin.cmd && plugin.cmd.includes(cmd)) {
                    plugin.run(conn, m, { args, text });
                }
            });

        } catch (err) {
            console.log(err);
        }
    });
}

startMantra();
