require('./config')
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys')
const { smsg } = require('./lib/simple')
const pino = require('pino')
const fs = require('fs')
const path = require('path')

async function startMantra() {
    
    // --- SESSION INJECTION START ---
    // This creates the session folder and creds.json from your long text string
    if (!fs.existsSync(global.sessionName)) {
        fs.mkdirSync(global.sessionName)
    }

    if (!fs.existsSync(path.join(global.sessionName, 'creds.json')) && global.sessionId) {
        console.log('🔒 Injecting Session ID...')
        const sessionParts = global.sessionId.split('Mantra~')
        const sessionData = sessionParts[1] // The base64 part
        
        if (sessionData) {
            const buffer = Buffer.from(sessionData, 'base64')
            const creds = buffer.toString('utf-8')
            fs.writeFileSync(path.join(global.sessionName, 'creds.json'), creds)
            console.log('✅ Session Injected Successfully')
        }
    }
    // --- SESSION INJECTION END ---

    const { state, saveCreds } = await useMultiFileAuthState(global.sessionName)
    const { version } = await fetchLatestBaileysVersion()
    
    const conn = makeWASocket({
        logger: pino({ level: 'silent' }),
        printQRInTerminal: true,
        auth: state,
        version
    })

    conn.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update
        if (connection === 'close') {
            let reason = lastDisconnect.error?.output?.statusCode
            if (reason !== DisconnectReason.loggedOut) startMantra()
            else console.log('Logged out. Delete session and scan again.')
        } else if (connection === 'open') {
            console.log('Mantra Connected ✅')
        }
    })

    conn.ev.on('creds.update', saveCreds)

    // Dynamic Plugin Loader
    const pluginFolder = path.join(__dirname, 'plugins')
    const plugins = new Map()

    const loadPlugins = () => {
        fs.readdirSync(pluginFolder).forEach(file => {
            if (file.endsWith('.js')) {
                delete require.cache[require.resolve(`./plugins/${file}`)]
                const plugin = require(`./plugins/${file}`)
                if (plugin.cmd) plugins.set(plugin.cmd, plugin)
            }
        })
        console.log(`Loaded ${plugins.size} plugins`)
    }
    
    loadPlugins()

    conn.ev.on('messages.upsert', async chatUpdate => {
        try {
            let m = chatUpdate.messages[0]
            if (!m.message) return
            m.message = (Object.keys(m.message)[0] === 'ephemeralMessage') ? m.message.ephemeralMessage.message : m.message
            if (m.key && m.key.remoteJid === 'status@broadcast') return
            
            // Serialize
            m = smsg(conn, m)
            
            const isCmd = m.body.startsWith(global.prefa)
            const command = isCmd ? m.body.slice(1).trim().split(' ').shift().toLowerCase() : ''
            const args = m.body.trim().split(/ +/).slice(1)
            const text = args.join(" ")

            // Execute Plugin
            if (isCmd && plugins.has(command)) {
                await plugins.get(command).run(conn, m, args, text)
            }
        } catch (err) {
            console.error(err)
        }
    })
}

startMantra()
