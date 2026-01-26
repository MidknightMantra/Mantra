require('./config')
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys')
const { smsg } = require('./lib/simple')
const pino = require('pino')
const fs = require('fs')
const path = require('path')

async function startMantra() {
    
    // --- SESSION INJECTION START ---
    if (!fs.existsSync(global.sessionName)) {
        fs.mkdirSync(global.sessionName)
    }

    if (!fs.existsSync(path.join(global.sessionName, 'creds.json')) && global.sessionId) {
        console.log('🔒 Injecting Session ID...')
        const sessionParts = global.sessionId.split('Mantra~')
        const sessionData = sessionParts[1]
        
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
        auth: state,
        version
        // printQRInTerminal: true  <-- DELETED (Deprecated)
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
        try {
            plugins.clear()
            if (fs.existsSync(pluginFolder)) {
                fs.readdirSync(pluginFolder).forEach(file => {
                    if (file.endsWith('.js')) {
                        const pluginPath = path.join(pluginFolder, file)
                        delete require.cache[require.resolve(pluginPath)]
                        const plugin = require(pluginPath)
                        if (plugin.cmd) plugins.set(plugin.cmd, plugin)
                    }
                })
            }
            console.log(`Loaded ${plugins.size} plugins`)
        } catch (err) {
            console.error('Error loading plugins:', err)
        }
    }
    
    loadPlugins()

    // Watch for plugin changes
    fs.watch(pluginFolder, (eventType, filename) => {
        if (filename && filename.endsWith('.js')) {
            console.log(`Plugin updated: ${filename}`)
            loadPlugins()
        }
    })

    conn.ev.on('messages.upsert', async chatUpdate => {
        try {
            let m = chatUpdate.messages[0]
            if (!m.message) return
            m.message = (Object.keys(m.message)[0] === 'ephemeralMessage') ? m.message.ephemeralMessage.message : m.message
            if (m.key && m.key.remoteJid === 'status@broadcast') return
            
            m = smsg(conn, m)
            
            // Handle Prefixes
            const prefix = global.prefa.find(p => m.body.startsWith(p)) || ''
            const isCmd = m.body.startsWith(prefix)
            const command = isCmd ? m.body.slice(prefix.length).trim().split(' ').shift().toLowerCase() : ''
            const args = m.body.trim().split(/ +/).slice(1)
            const text = args.join(" ")

            if (isCmd && plugins.has(command)) {
                await plugins.get(command).run(conn, m, args, text)
            }
        } catch (err) {
            console.error(err)
        }
    })
}

startMantra()
