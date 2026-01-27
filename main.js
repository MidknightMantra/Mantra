require('./config')
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys')
const { smsg } = require('./lib/simple')
const pino = require('pino')
const fs = require('fs')
const path = require('path')

async function startMantra() {
    
    // --- SESSION INJECTION ---
    if (!fs.existsSync(global.sessionName)) fs.mkdirSync(global.sessionName)
    
    // Only inject if creds.json is missing (Prevents overwriting valid sessions)
    if (!fs.existsSync(path.join(global.sessionName, 'creds.json')) && global.sessionId) {
        console.log('🔒 Injecting Session ID...')
        const sessionParts = global.sessionId.split('Mantra~')
        const sessionData = sessionParts[1]
        
        if (sessionData) {
            fs.writeFileSync(path.join(global.sessionName, 'creds.json'), Buffer.from(sessionData, 'base64').toString('utf-8'))
            console.log('✅ Session Injected Successfully')
        }
    }

    const { state, saveCreds } = await useMultiFileAuthState(global.sessionName)
    const { version } = await fetchLatestBaileysVersion()
    
    const conn = makeWASocket({
        logger: pino({ level: 'silent' }),
        auth: state,
        version,
        // Increase timeout to prevent 428 errors on slow networks
        connectTimeoutMs: 60000, 
        defaultQueryTimeoutMs: 0,
        keepAliveIntervalMs: 10000,
        emitOwnEvents: true,
        fireInitQueries: true,
        generateHighQualityLinkPreview: true,
        syncFullHistory: true,
        markOnlineOnConnect: true
    })

    conn.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update
        if (connection === 'close') {
            let reason = lastDisconnect.error?.output?.statusCode
            console.log(`⚠️ Connection closed. Reason: ${reason}`)
            
            // Reconnect unless logged out
            if (reason !== DisconnectReason.loggedOut) {
                console.log('🔄 Reconnecting...')
                startMantra()
            } else {
                console.log('❌ Logged out. Delete session and scan again.')
            }
        } else if (connection === 'open') {
            console.log('Mantra Connected ✅')
            console.log(`⚡ Active Prefixes: "${global.prefa.join('" "')}"`)
        }
    })

    conn.ev.on('creds.update', saveCreds)

    // Plugin Loader
    const pluginFolder = path.join(__dirname, 'plugins')
    const plugins = new Map()

    const loadPlugins = () => {
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
        console.log(`🔌 Loaded Plugins: [${Array.from(plugins.keys()).join(', ')}]`)
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

            // --- FIXED MATCHING LOGIC ---
            // 1. Find the prefix used (if any)
            const prefix = global.prefa.find(p => m.body.startsWith(p)) || ''
            
            // 2. Check if it is a command
            const isCmd = m.body.startsWith(prefix)
            
            // 3. Extract Command (Remove prefix, trim, split spaces, lowercase)
            const command = isCmd 
                ? m.body.slice(prefix.length).trim().split(' ').shift().toLowerCase() 
                : ''
                
            const args = m.body.trim().split(/ +/).slice(1)
            const text = args.join(" ")

            // Debug Print for You
            if (isCmd && command) {
                 console.log(`💬 Cmd: ${command} | Prefix: "${prefix}" | Plugin Exists: ${plugins.has(command)}`)
            }

            if (isCmd && plugins.has(command)) {
                await plugins.get(command).run(conn, m, args, text)
            }
        } catch (err) {
            console.error('Message Error:', err)
        }
    })
    
    // Handle Uncaught Errors (Prevent Crash on 428)
    process.on('uncaughtException', function (err) {
        console.log('Caught exception: ', err)
    })
}

startMantra()
