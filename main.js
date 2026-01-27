require('./config')
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeInMemoryStore } = require('@whiskeysockets/baileys')
const { smsg } = require('./lib/simple')
const { downloadMedia } = require('./lib/media')
const pino = require('pino')
const fs = require('fs')
const path = require('path')

const store = makeInMemoryStore({ logger: pino().child({ level: 'silent', stream: 'store' }) })
const msgRetryMap = new Map()

async function startMantra() {
    
    // Session Injection
    if (!fs.existsSync(global.sessionName)) fs.mkdirSync(global.sessionName)
    if (!fs.existsSync(path.join(global.sessionName, 'creds.json')) && global.sessionId) {
        console.log('🔒 Injecting Session ID...')
        const sessionParts = global.sessionId.split('Mantra~')
        const sessionData = sessionParts[1]
        if (sessionData) {
            fs.writeFileSync(path.join(global.sessionName, 'creds.json'), Buffer.from(sessionData, 'base64').toString('utf-8'))
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

    store.bind(conn.ev)

    conn.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update
        if (connection === 'close') {
            let reason = lastDisconnect.error?.output?.statusCode
            if (reason !== DisconnectReason.loggedOut) {
                console.log('🔄 Reconnecting...')
                startMantra()
            } else {
                console.log('❌ Logged out.')
            }
        } else if (connection === 'open') {
            console.log('Mantra Connected ✅')
            console.log(`👀 Auto-Status View: ${global.autoStatusRead ? 'ON' : 'OFF'}`)
            
            if (global.alwaysOnline) {
                setInterval(() => conn.sendPresenceUpdate('available'), 10_000)
            }
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
        console.log(`🔌 Loaded ${plugins.size} Plugins`)
    }
    loadPlugins()

    conn.ev.on('messages.upsert', async chatUpdate => {
        try {
            if (chatUpdate.type === 'append') return
            let m = chatUpdate.messages[0]
            if (!m.message) return

            // ============================================================
            //                AUTO STATUS VIEW (The New Feature)
            // ============================================================
            if (m.key.remoteJid === 'status@broadcast') {
                if (global.autoStatusRead) {
                    // This sends the "Read Receipt" so you appear in their list
                    await conn.readMessages([m.key])
                    console.log(`👀 Auto-Viewed Status from ${m.pushName || m.key.participant.split('@')[0]}`)
                }
                return // Stop here so we don't try to execute commands from statuses
            }
            // ============================================================

            // Anti-Delete Logic
            if (m.message.protocolMessage && m.message.protocolMessage.type === 0) {
                const key = m.message.protocolMessage.key
                const msg = await store.loadMessage(key.remoteJid, key.id)
                if (msg) {
                    console.log(`🗑️ Recovering deleted message...`)
                    const myJid = conn.user.id.split(':')[0] + '@s.whatsapp.net'
                    const participant = msg.participant || msg.key.participant || m.sender
                    const caption = `🗑️ *Deleted Message Detected*\nFrom: @${participant.split('@')[0]}\nChat: ${m.key.remoteJid.endsWith('@g.us') ? 'Group' : 'DM'}`

                    if (msg.message.conversation || msg.message.extendedTextMessage) {
                        const text = msg.message.conversation || msg.message.extendedTextMessage.text
                        await conn.sendMessage(myJid, { text: `${caption}\n\n📝 *Content:*\n${text}`, mentions: [participant] })
                    } else {
                        const messageType = Object.keys(msg.message)[0]
                        const media = msg.message[messageType]
                        if (['imageMessage', 'videoMessage', 'stickerMessage', 'audioMessage'].includes(messageType)) {
                            const type = messageType.replace('Message', '')
                            const buffer = await downloadMedia({ msg: media, mtype: type })
                            
                            if (type === 'image') await conn.sendMessage(myJid, { image: buffer, caption: caption, mentions: [participant] })
                            else if (type === 'video') await conn.sendMessage(myJid, { video: buffer, caption: caption, mentions: [participant] })
                            else if (type === 'sticker') await conn.sendMessage(myJid, { sticker: buffer })
                            else if (type === 'audio') await conn.sendMessage(myJid, { audio: buffer, mimetype: 'audio/mp4' })
                        }
                    }
                }
                return
            }

            if (msgRetryMap.has(m.key.id)) return
            msgRetryMap.set(m.key.id, true)
            setTimeout(() => msgRetryMap.delete(m.key.id), 5000)

            m.message = m.message.ephemeralMessage?.message || m.message
            
            // Staleness Check
            if (m.messageTimestamp) {
                const msgTime = (typeof m.messageTimestamp === 'number') ? m.messageTimestamp : m.messageTimestamp.low || m.messageTimestamp
                const now = Math.floor(Date.now() / 1000)
                if (now - msgTime > 30) return 
            }
            
            m = smsg(conn, m)
            
            // Anti-ViewOnce Logic
            if (global.antiViewOnce && !m.key.fromMe) {
                 try {
                    let viewOnceMsg = m.message.viewOnceMessage || m.message.viewOnceMessageV2 || m.message.viewOnceMessageV2Extension
                    if (viewOnceMsg) {
                        const content = viewOnceMsg.message.imageMessage || viewOnceMsg.message.videoMessage
                        if (content) {
                            const mtype = content.mimetype.split('/')[0] === 'image' ? 'imageMessage' : 'videoMessage'
                            const buffer = await downloadMedia({ msg: content, mtype: mtype })
                            const myJid = conn.user.id.split(':')[0] + '@s.whatsapp.net'
                            const caption = `🕵️ *Auto-Recovered ViewOnce*\nFrom: @${m.sender.split('@')[0]}`
                            
                            if (mtype === 'imageMessage') {
                                await conn.sendMessage(myJid, { image: buffer, caption: caption, mentions: [m.sender] })
                            } else {
                                await conn.sendMessage(myJid, { video: buffer, caption: caption, mentions: [m.sender] })
                            }
                        }
                    }
                } catch (err) {}
            }

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
            console.error('Error:', err)
        }
    })
    
    process.on('uncaughtException', function (err) {
        console.log('Caught exception: ', err)
    })
}

startMantra()
