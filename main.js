require('./config')
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys')
const { smsg } = require('./lib/simple')
const { downloadMedia } = require('./lib/media') // Import the downloader
const pino = require('pino')
const fs = require('fs')
const path = require('path')

async function startMantra() {
    
    // --- SESSION INJECTION ---
    if (!fs.existsSync(global.sessionName)) fs.mkdirSync(global.sessionName)
    
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
            
            if (reason !== DisconnectReason.loggedOut) {
                console.log('🔄 Reconnecting...')
                startMantra()
            } else {
                console.log('❌ Logged out. Delete session and scan again.')
            }
        } else if (connection === 'open') {
            console.log('Mantra Connected ✅')
            console.log(`⚡ Active Prefixes: "${global.prefa.join('" "')}"`)
            console.log(`🕵️ Anti-ViewOnce: ${global.antiViewOnce ? 'ACTIVE' : 'OFF'}`)
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
            
            // --- AUTOMATIC ANTI-VIEWONCE LOGIC ---
            if (global.antiViewOnce && (m.mtype === 'viewOnceMessage' || m.mtype === 'viewOnceMessageV2')) {
                try {
                    // 1. Identify Content
                    const msg = m.message.viewOnceMessage?.message || m.message.viewOnceMessageV2?.message || m.message
                    const type = Object.keys(msg)[0]
                    const media = msg[type]
                    
                    // 2. Download
                    const buffer = await downloadMedia({ msg: media, mtype: type })
                    
                    // 3. Send to Self (Saved Messages)
                    const myJid = conn.user.id.split(':')[0] + '@s.whatsapp.net'
                    const caption = `🕵️ *Auto-Recovered ViewOnce*\nFrom: @${m.sender.split('@')[0]}\nGroup: ${m.isGroup ? m.chat : 'DM'}`
                    
                    if (type === 'imageMessage') {
                        await conn.sendMessage(myJid, { image: buffer, caption: caption, mentions: [m.sender] })
                    } else if (type === 'videoMessage') {
                        await conn.sendMessage(myJid, { video: buffer, caption: caption, mentions: [m.sender] })
                    }
                    console.log(`✅ Stole ViewOnce from ${m.sender}`)
                    
                } catch (err) {
                    console.error('Anti-ViewOnce Failed:', err)
                }
            }
            // -------------------------------------

            if (!m.body) return

            // Command Matching
            const prefix = global.prefa.find(p => m.body.startsWith(p)) || ''
            const isCmd = m.body.startsWith(prefix)
            const command = isCmd 
                ? m.body.slice(prefix.length).trim().split(' ').shift().toLowerCase() 
                : ''
                
            const args = m.body.trim().split(/ +/).slice(1)
            const text = args.join(" ")

            if (isCmd && plugins.has(command)) {
                await plugins.get(command).run(conn, m, args, text)
            }
        } catch (err) {
            console.error('Message Error:', err)
        }
    })
    
    process.on('uncaughtException', function (err) {
        console.log('Caught exception: ', err)
    })
}

startMantra()
