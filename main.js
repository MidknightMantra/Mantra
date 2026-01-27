require('./config')
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys')
const { smsg } = require('./lib/simple')
const { downloadMedia } = require('./lib/media')
const pino = require('pino')
const fs = require('fs')
const path = require('path')

// --- DEDUPLICATION CACHE ---
// Prevents the bot from processing the same message twice (Fixes Double Reply)
const msgRetryMap = new Map()
// ---------------------------

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
            if (chatUpdate.type === 'append') return
            let m = chatUpdate.messages[0]
            if (!m.message) return
            
            // --- DEDUPLICATION CHECK ---
            if (msgRetryMap.has(m.key.id)) return
            msgRetryMap.set(m.key.id, true)
            // Clear memory after 5 seconds
            setTimeout(() => msgRetryMap.delete(m.key.id), 5000)
            // ---------------------------

            m.message = m.message.ephemeralMessage?.message || m.message
            if (m.key?.remoteJid === 'status@broadcast') return

            // Staleness Check
            if (m.messageTimestamp) {
                const msgTime = (typeof m.messageTimestamp === 'number') ? m.messageTimestamp : m.messageTimestamp.low || m.messageTimestamp
                const now = Math.floor(Date.now() / 1000)
                if (now - msgTime > 30) return 
            }
            
            m = smsg(conn, m)
            
            // --- ROBUST AUTO-VIEWONCE LOGIC ---
            if (global.antiViewOnce && !m.key.fromMe) {
                try {
                    // Deep scan for ViewOnce structure
                    let viewOnceMsg = m.message.viewOnceMessage || m.message.viewOnceMessageV2 || m.message.viewOnceMessageV2Extension
                    
                    if (viewOnceMsg) {
                        const content = viewOnceMsg.message.imageMessage || viewOnceMsg.message.videoMessage
                        if (content) {
                            const mtype = content.mimetype.split('/')[0] === 'image' ? 'imageMessage' : 'videoMessage'
                            
                            const buffer = await downloadMedia({ msg: content, mtype: mtype })
                            
                            const myJid = conn.user.id.split(':')[0] + '@s.whatsapp.net'
                            const caption = `🕵️ *Auto-Recovered*\nFrom: @${m.sender.split('@')[0]}`
                            
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
            // -------------------------------------

            if (!m.body) return

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
