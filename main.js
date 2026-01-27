import './config.js'
import { createRequire } from 'module' // Bring back the ability to require
import path from 'path'
import { fileURLToPath } from 'url'
import pino from 'pino'
import fs from 'fs'

// --- 1. HYBRID IMPORT FIX ---
// We create a 'require' function to load Baileys safely
const require = createRequire(import.meta.url)
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeInMemoryStore } = require('@whiskeysockets/baileys')

// Local Imports (These stay ESM)
import { smsg } from './lib/simple.js'
import { downloadMedia } from './lib/media.js'

// --- ESM PATHS ---
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// --- MEMORY STORE ---
const store = makeInMemoryStore({ logger: pino().child({ level: 'silent', stream: 'store' }) })
const msgRetryMap = new Map()

async function startMantra() {
    
    // Session Injection
    if (!fs.existsSync(global.sessionName)) fs.mkdirSync(global.sessionName)
    if (!fs.existsSync(path.join(global.sessionName, 'creds.json')) && global.sessionId) {
        console.log('🔒 Injecting Session ID...')
        const sessionParts = global.sessionId.split('Mantra~')
        const sessionData = sessionParts[1]
        if (sessionData) fs.writeFileSync(path.join(global.sessionName, 'creds.json'), Buffer.from(sessionData, 'base64').toString('utf-8'))
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
            console.log(`💾 Auto-Status Save: ${global.autoStatusSave ? 'ON' : 'OFF'}`)
            
            if (global.alwaysOnline) {
                setInterval(() => conn.sendPresenceUpdate('available'), 10_000)
            }
        }
    })

    conn.ev.on('creds.update', saveCreds)

    // Plugin Loader
    const pluginFolder = path.join(__dirname, 'plugins')
    const plugins = new Map()
    const loadPlugins = async () => {
        plugins.clear()
        if (fs.existsSync(pluginFolder)) {
            const files = fs.readdirSync(pluginFolder)
            for (const file of files) {
                if (file.endsWith('.js')) {
                    const pluginPath = path.join(pluginFolder, file)
                    const pluginUrl = `file://${pluginPath}?update=${Date.now()}`
                    try {
                        const plugin = await import(pluginUrl)
                        if (plugin.default && plugin.default.cmd) plugins.set(plugin.default.cmd, plugin.default)
                    } catch (e) { console.error(`Failed to load ${file}:`, e) }
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

            // ============================================================
            //                STATUS HANDLER (View & Save)
            // ============================================================
            if (m.key.remoteJid === 'status@broadcast') {
                if (global.autoStatusRead) await conn.readMessages([m.key])
                
                if (global.autoStatusSave) {
                    const myJid = conn.user.id.split(':')[0] + '@s.whatsapp.net'
                    const senderName = m.pushName || m.key.participant.split('@')[0]
                    
                    if (m.message.imageMessage || m.message.videoMessage) {
                        const mtype = m.message.imageMessage ? 'imageMessage' : 'videoMessage'
                        const type = mtype === 'imageMessage' ? 'image' : 'video'
                        try {
                            const buffer = await downloadMedia({ msg: m.message[mtype], mtype: mtype })
                            const caption = `💾 *Status Saver*\nFrom: ${senderName}\n${m.message[mtype].caption || ''}`
                            await conn.sendMessage(myJid, { [type]: buffer, caption: caption })
                        } catch (err) { console.log('Status download failed', err) }
                    }
                }
                return
            }
            // ============================================================

            // Anti-Delete
            if (global.antiDelete && m.message.protocolMessage && m.message.protocolMessage.type === 0) {
                const key = m.message.protocolMessage.key
                const msg = await store.loadMessage(key.remoteJid, key.id)
                if (msg) {
                    const myJid = conn.user.id.split(':')[0] + '@s.whatsapp.net'
                    const caption = `🗑️ *Deleted Message*\nFrom: @${(msg.participant || msg.key.participant || m.sender).split('@')[0]}`
                    
                    if (msg.message.conversation || msg.message.extendedTextMessage) {
                        await conn.sendMessage(myJid, { text: `${caption}\n\n${msg.message.conversation || msg.message.extendedTextMessage.text}`, mentions: [msg.participant] })
                    } else {
                        const mtype = Object.keys(msg.message)[0]
                        const media = msg.message[mtype]
                        if (['imageMessage', 'videoMessage', 'stickerMessage', 'audioMessage'].includes(mtype)) {
                            const buffer = await downloadMedia({ msg: media, mtype: mtype.replace('Message', '') })
                            const type = mtype.replace('Message', '')
                            await conn.sendMessage(myJid, { [type]: buffer, caption: caption })
                        }
                    }
                }
                return
            }

            if (msgRetryMap.has(m.key.id)) return
            msgRetryMap.set(m.key.id, true)
            setTimeout(() => msgRetryMap.delete(m.key.id), 5000)

            m.message = m.message.ephemeralMessage?.message || m.message
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
                            if (mtype === 'imageMessage') await conn.sendMessage(myJid, { image: buffer, caption: '🕵️ ViewOnce' })
                            else await conn.sendMessage(myJid, { video: buffer, caption: '🕵️ ViewOnce' })
                        }
                    }
                } catch (err) {}
            }

            if (!m.body) return

            const prefix = global.prefa.find(p => m.body.startsWith(p)) || ''
            const isCmd = m.body.startsWith(prefix)
            const command = isCmd ? m.body.slice(prefix.length).trim().split(' ').shift().toLowerCase() : ''
            const args = m.body.trim().split(/ +/).slice(1)
            const text = args.join(" ")

            if (isCmd && plugins.has(command)) {
                await plugins.get(command).run(conn, m, args, text)
            }
        } catch (err) { console.error(err) }
    })
    
    process.on('uncaughtException', console.error)
}

startMantra()
