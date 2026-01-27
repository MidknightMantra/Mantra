import './config.js' 
import { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeInMemoryStore } from '@whiskeysockets/baileys'
import pino from 'pino'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { smsg } from './lib/simple.js'
import { downloadMedia } from './lib/media.js'

// --- ESM Fix for __dirname ---
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// --- 1. MEMORY STORE (The Brain) ---
const store = makeInMemoryStore({ logger: pino().child({ level: 'silent', stream: 'store' }) })

// Deduplication Cache
const msgRetryMap = new Map()

async function startMantra() {
    
    // --- SESSION INJECTION ---
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

    // --- 2. BIND STORE ---
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

    // Plugin Loader (Adapted for ESM)
    const pluginFolder = path.join(__dirname, 'plugins')
    const plugins = new Map()
    
    const loadPlugins = async () => {
        plugins.clear()
        if (fs.existsSync(pluginFolder)) {
            const files = fs.readdirSync(pluginFolder)
            for (const file of files) {
                if (file.endsWith('.js')) {
                    const pluginPath = path.join(pluginFolder, file)
                    // In ESM, we use dynamic import
                    // We add a timestamp query to force cache invalidation if needed
                    const plugin = await import(`file://${pluginPath}?update=${Date.now()}`)
                    if (plugin.default && plugin.default.cmd) {
                        plugins.set(plugin.default.cmd, plugin.default)
                    } else if (plugin.cmd) {
                        plugins.set(plugin.cmd, plugin)
                    }
                }
            }
        }
        console.log(`🔌 Loaded ${plugins.size} Plugins`)
    }
    await loadPlugins()

    conn.ev.on('messages.upsert', async chatUpdate => {
        try {
            if (chatUpdate.type === 'append') return
            let m = chatUpdate.messages[0]
            if (!m.message) return

            // Auto-Status View
            if (m.key.remoteJid === 'status@broadcast') {
                if (global.autoStatusRead) {
                    await conn.readMessages([m.key])
                    console.log(`👀 Auto-Viewed Status from ${m.pushName || m.key.participant.split('@')[0]}`)
                }
                return
            }

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
            
            if (m.messageTimestamp) {
                const msgTime = (typeof m.messageTimestamp === 'number') ? m.messageTimestamp : m.messageTimestamp.low || m.messageTimestamp
                const now = Math.floor(Date.now() / 1000)
                if (now - msgTime > 30) return 
            }
            
            m = smsg(conn, m)
            
            // Anti-ViewOnce
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
