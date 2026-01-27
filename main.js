require('./config')
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeInMemoryStore } = require('@whiskeysockets/baileys')
const { smsg } = require('./lib/simple')
const { downloadMedia } = require('./lib/media')
const pino = require('pino')
const fs = require('fs')
const path = require('path')

// --- DEDUPLICATION CACHE ---
// Prevents the bot from processing the same message ID twice
const msgRetryMap = new Map()

async function startMantra() {
    
    // --- 1. SESSION INJECTION ---
    // Decodes the BASE64 Session ID if credentials don't exist
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
        markOnlineOnConnect: true,
        browser: ["Mantra", "Chrome", "1.0.0"]
    })

    // --- 2. CONNECTION HANDLER ---
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

            // --- 3. ALWAYS ONLINE HEARTBEAT ---
            if (global.alwaysOnline) {
                setInterval(() => {
                    conn.sendPresenceUpdate('available')
                }, 10_000) // Pings server every 10 seconds
                console.log('🟢 Always Online: ACTIVE')
            }
        }
    })

    conn.ev.on('creds.update', saveCreds)

    // --- 4. PLUGIN LOADER ---
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

    // --- 5. MESSAGE HANDLER ---
    conn.ev.on('messages.upsert', async chatUpdate => {
        try {
            // Ignore history syncs (old messages loading in background)
            if (chatUpdate.type === 'append') return
            
            let m = chatUpdate.messages[0]
            if (!m.message) return

            // --- DEDUPLICATION CHECK ---
            if (msgRetryMap.has(m.key.id)) return
            msgRetryMap.set(m.key.id, true)
            setTimeout(() => msgRetryMap.delete(m.key.id), 5000) // Clear after 5s

            // Handle Ephemeral Messages (Disappearing messages)
            m.message = m.message.ephemeralMessage?.message || m.message
            if (m.key?.remoteJid === 'status@broadcast') return

            // --- STALENESS CHECK ---
            // Ignore messages older than 30 seconds (Prevents replying to old commands on startup)
            if (m.messageTimestamp) {
                const msgTime = (typeof m.messageTimestamp === 'number') ? m.messageTimestamp : m.messageTimestamp.low || m.messageTimestamp
                const now = Math.floor(Date.now() / 1000)
                if (now - msgTime > 30) return 
            }
            
            // Standardize the message object
            m = smsg(conn, m)
            
            // --- 6. AUTO-VIEWONCE LOGIC (God Mode) ---
            if (global.antiViewOnce && !m.key.fromMe) {
                try {
                    // Deep Scan for V1, V2, and V2Extension ViewOnce types
                    let viewOnceMsg = m.message.viewOnceMessage || m.message.viewOnceMessageV2 || m.message.viewOnceMessageV2Extension
                    
                    if (viewOnceMsg) {
                        const content = viewOnceMsg.message.imageMessage || viewOnceMsg.message.videoMessage
                        if (content) {
                            const mtype = content.mimetype.split('/')[0] === 'image' ? 'imageMessage' : 'videoMessage'
                            
                            // Download
                            const buffer = await downloadMedia({ msg: content, mtype: mtype })
                            
                            // Send to Self (Saved Messages)
                            const myJid = conn.user.id.split(':')[0] + '@s.whatsapp.net'
                            const caption = `🕵️ *Auto-Recovered*\nFrom: @${m.sender.split('@')[0]}\nChat: ${m.isGroup ? 'Group' : 'DM'}`
                            
                            if (mtype === 'imageMessage') {
                                await conn.sendMessage(myJid, { image: buffer, caption: caption, mentions: [m.sender] })
                            } else {
                                await conn.sendMessage(myJid, { video: buffer, caption: caption, mentions: [m.sender] })
                            }
                            console.log(`✅ Auto-Saved ViewOnce from ${m.sender}`)
                        }
                    }
                } catch (err) {
                    console.error('Anti-ViewOnce Error:', err)
                }
            }
            // ----------------------------------------

            if (!m.body) return

            // --- COMMAND PARSER ---
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
    
    // Prevent crash on unhandled errors
    process.on('uncaughtException', function (err) {
        console.log('Caught exception: ', err)
    })
}

startMantra()
