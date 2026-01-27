import './config.js'
import { createRequire } from 'module' 
import path from 'path'
import { fileURLToPath } from 'url'
import pino from 'pino'
import fs from 'fs'

// --- 1. ROBUST LIBRARY IMPORT (The Fix) ---
// We use 'createRequire' to handle the Baileys library safely in ESM mode
const require = createRequire(import.meta.url)
const BaileysLib = require('@whiskeysockets/baileys')

// Helper to safely extract functions whether they are named or default exports
const getExport = (key) => {
    return BaileysLib[key] || BaileysLib.default?.[key] || BaileysLib.default?.default?.[key]
}

const makeWASocket = getExport('default') || BaileysLib.default
const useMultiFileAuthState = getExport('useMultiFileAuthState')
const DisconnectReason = getExport('DisconnectReason')
const fetchLatestBaileysVersion = getExport('fetchLatestBaileysVersion')
let makeInMemoryStore = getExport('makeInMemoryStore')

// Fallback: If makeInMemoryStore is still missing, try direct subpath require
if (!makeInMemoryStore) {
    try {
        const StoreLib = require('@whiskeysockets/baileys/lib/Store')
        makeInMemoryStore = StoreLib.makeInMemoryStore
    } catch (e) {
        console.warn('⚠️ Could not load makeInMemoryStore. Anti-Delete will be disabled.')
    }
}

// Local Imports (ESM)
import { smsg } from './lib/simple.js'
import { downloadMedia } from './lib/media.js'

// --- ESM PATHS ---
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// --- MEMORY STORE (Anti-Delete Brain) ---
const store = makeInMemoryStore ? makeInMemoryStore({ logger: pino().child({ level: 'silent', stream: 'store' }) }) : null
const msgRetryMap = new Map()

if (store) console.log('🛡️ Anti-Delete System: ACTIVE')
else console.log('⚠️ Anti-Delete System: DISABLED')

async function startMantra() {
    
    // --- SESSION MANAGEMENT ---
    if (!fs.existsSync(global.sessionName)) fs.mkdirSync(global.sessionName)
    
    // Inject Session ID from Environment (Railway)
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

    // Bind the store to the connection events
    if (store) store.bind(conn.ev)

    // --- CONNECTION UPDATE HANDLER ---
    conn.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update
        if (connection === 'close') {
            let reason = lastDisconnect.error?.output?.statusCode
            if (reason !== DisconnectReason.loggedOut) {
                console.log('🔄 Reconnecting...')
                startMantra()
            } else {
                console.log('❌ Logged out. Please scan QR again.')
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

    // --- PLUGIN LOADER ---
    const pluginFolder = path.join(__dirname, 'plugins')
    const plugins = new Map()
    
    const loadPlugins = async () => {
        plugins.clear()
        if (fs.existsSync(pluginFolder)) {
            const files = fs.readdirSync(pluginFolder)
            for (const file of files) {
                if (file.endsWith('.js')) {
                    const pluginPath = path.join(pluginFolder, file)
                    // We use a timestamp to bypass cache for hot-reloading
                    const pluginUrl = `file://${pluginPath}?update=${Date.now()}`
                    try {
                        const plugin = await import(pluginUrl)
                        if (plugin.default && plugin.default.cmd) {
                            plugins.set(plugin.default.cmd, plugin.default)
                        }
                    } catch (e) {
                        console.error(`❌ Failed to load ${file}:`, e)
                    }
                }
            }
        }
        console.log(`🔌 Loaded ${plugins.size} Plugins`)
    }
    await loadPlugins()

    // --- MESSAGE HANDLER ---
    conn.ev.on('messages.upsert', async chatUpdate => {
        try {
            if (chatUpdate.type === 'append') return
            let m = chatUpdate.messages[0]
            if (!m.message) return

            // ============================================================
            //                1. STATUS HANDLER (View & Save)
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
                        } catch (err) { 
                            console.log('Status download failed', err) 
                        }
                    }
                }
                return
            }

            // ============================================================
            //                2. ANTI-DELETE (Ghost Protocol)
            // ============================================================
            if (global.antiDelete && m.message.protocolMessage && m.message.protocolMessage.type === 0 && store) {
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

            // Prevent spam handling
            if (msgRetryMap.has(m.key.id)) return
            msgRetryMap.set(m.key.id, true)
            setTimeout(() => msgRetryMap.delete(m.key.id), 5000)

            m.message = m.message.ephemeralMessage?.message || m.message
            m = smsg(conn, m)
            
            // ============================================================
            //                3. ANTI-VIEWONCE (Stealth Mode)
            // ============================================================
            if (global.antiViewOnce && !m.key.fromMe) {
                 try {
                    let viewOnceMsg = m.message.viewOnceMessage || m.message.viewOnceMessageV2 || m.message.viewOnceMessageV2Extension
                    if (viewOnceMsg) {
                        const content = viewOnceMsg.message.imageMessage || viewOnceMsg.message.videoMessage
                        if (content) {
                            const mtype = content.mimetype.split('/')[0] === 'image' ? 'imageMessage' : 'videoMessage'
                            const buffer = await downloadMedia({ msg: content, mtype: mtype })
                            const myJid = conn.user.id.split(':')[0] + '@s.whatsapp.net'
                            if (mtype === 'imageMessage') await conn.sendMessage(myJid, { image: buffer, caption: '🕵️ ViewOnce Detected' })
                            else await conn.sendMessage(myJid, { video: buffer, caption: '🕵️ ViewOnce Detected' })
                        }
                    }
                } catch (err) {}
            }

            if (!m.body) return

            // ============================================================
            //                4. COMMAND HANDLER
            // ============================================================
            const prefix = global.prefa.find(p => m.body.startsWith(p)) || ''
            const isCmd = m.body.startsWith(prefix)
            const command = isCmd ? m.body.slice(prefix.length).trim().split(' ').shift().toLowerCase() : ''
            const args = m.body.trim().split(/ +/).slice(1)
            const text = args.join(" ")

            if (isCmd && plugins.has(command)) {
                await plugins.get(command).run(conn, m, args, text)
            }
        } catch (err) { 
            console.error('Error in message handler:', err) 
        }
    })
    
    // Global Error Handler to prevent crash
    process.on('uncaughtException', (err) => {
        console.error('Caught exception:', err)
    })
}

startMantra()
