require('./config')
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys')
const { smsg } = require('./lib/simple')
const pino = require('pino')
const fs = require('fs')
const path = require('path')

async function startMantra() {
    
    // --- SESSION INJECTION ---
    if (!fs.existsSync(global.sessionName)) fs.mkdirSync(global.sessionName)
    if (!fs.existsSync(path.join(global.sessionName, 'creds.json')) && global.sessionId) {
        const parts = global.sessionId.split('Mantra~')
        if (parts[1]) fs.writeFileSync(path.join(global.sessionName, 'creds.json'), Buffer.from(parts[1], 'base64').toString('utf-8'))
    }

    const { state, saveCreds } = await useMultiFileAuthState(global.sessionName)
    const { version } = await fetchLatestBaileysVersion()
    
    const conn = makeWASocket({
        logger: pino({ level: 'silent' }),
        auth: state,
        version
    })

    conn.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update
        if (connection === 'close') {
            if (lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut) startMantra()
        } else if (connection === 'open') {
            console.log('Mantra Connected ✅')
            // --- DIAGNOSTIC START ---
            console.log('--------------------------------')
            console.log(`🔌 Loaded Plugins: [${Array.from(plugins.keys()).join(', ')}]`)
            console.log(`⚡ Active Prefixes: "${global.prefa.join('" "')}"`)
            console.log('--------------------------------')
            // --- DIAGNOSTIC END ---
        }
    })

    conn.ev.on('creds.update', saveCreds)

    const pluginFolder = path.join(__dirname, 'plugins')
    const plugins = new Map()

    const loadPlugins = () => {
        plugins.clear()
        if (fs.existsSync(pluginFolder)) {
            fs.readdirSync(pluginFolder).forEach(file => {
                if (file.endsWith('.js')) {
                    const plugin = require(path.join(pluginFolder, file))
                    if (plugin.cmd) plugins.set(plugin.cmd, plugin)
                }
            })
        }
    }
    loadPlugins()

    conn.ev.on('messages.upsert', async chatUpdate => {
        try {
            let m = chatUpdate.messages[0]
            if (!m.message) return
            m.message = m.message.ephemeralMessage?.message || m.message
            if (m.key?.remoteJid === 'status@broadcast') return
            
            m = smsg(conn, m)
            if (!m.body) return

            // --- DEBUG MATCHING ---
            const prefix = global.prefa.find(p => m.body.startsWith(p)) || ''
            const isCmd = m.body.startsWith(prefix)
            const command = isCmd ? m.body.slice(prefix.length).trim().split(' ').shift().toLowerCase() : ''
            const args = m.body.trim().split(/ +/).slice(1)
            const text = args.join(" ")

            if (m.body.length < 10) { // Only log short messages to keep logs clean
                console.log(`💬 Received: "${m.body}"`)
                console.log(`🔍 Detected Prefix: "${prefix}"`)
                console.log(`⚙️ Detected Command: "${command}"`)
                console.log(`❓ Is Command Plugin? ${plugins.has(command)}`)
            }

            if (isCmd && plugins.has(command)) {
                await plugins.get(command).run(conn, m, args, text)
            }
        } catch (err) {
            console.error(err)
        }
    })
}

startMantra()
