import './config.js'
import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs/promises'
import pino from 'pino'
import { smsg } from './lib/simple.js'

const require = createRequire(import.meta.url)
const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason, 
    makeInMemoryStore,
    fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys')

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const store = makeInMemoryStore({ logger: pino({ level: 'silent' }) })

// --- 🔄 AUTO-RESTART (24h) ---
setTimeout(() => process.exit(0), 24 * 60 * 60 * 1000)

async function startMantra() {
    const sessionDir = './session'
    await fs.mkdir(sessionDir, { recursive: true })

    // Restore Session
    const credsPath = path.join(sessionDir, 'creds.json')
    if (!(await fs.stat(credsPath).catch(() => false)) && global.sessionId) {
        const base64Data = global.sessionId.split('Mantra~')[1] || global.sessionId
        await fs.writeFile(credsPath, Buffer.from(base64Data, 'base64').toString('utf-8'))
    }

    const { state, saveCreds } = await useMultiFileAuthState(sessionDir)
    let { version } = await fetchLatestBaileysVersion().catch(() => ({ version: [2, 3000, 1015901307] }))

    const conn = makeWASocket({
        logger: pino({ level: 'silent' }),
        auth: state,
        version,
        browser: ['Mantra', 'Chrome', '1.0.0'],
        markOnlineOnConnect: true, // 🟢 Set online on startup
        getMessage: async (key) => {
            if (store) return (await store.loadMessage(key.remoteJid, key.id))?.message || undefined
            return { conversation: "Mantra: Store not ready" }
        }
    })

    store.bind(conn.ev)

    // --- 🟢 ALWAYS ONLINE HEARTBEAT ---
    conn.ev.on('connection.update', (up) => {
        if (up.connection === 'open') {
            console.log('✅ Mantra Connected & Always Online!')
            setInterval(async () => {
                await conn.sendPresenceUpdate('available')
            }, 15000)
        }
        if (up.connection === 'close' && up.lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) startMantra()
    })

    // --- 🛡️ ANTI-DELETE (SAME AS BEFORE) ---
    conn.ev.on('messages.update', async (chatUpdate) => {
        for (const { key, update } of chatUpdate) {
            if (update.protocolMessage && update.protocolMessage.type === 0) {
                const msgId = update.protocolMessage.key.id
                const cachedMsg = await store.loadMessage(key.remoteJid, msgId)
                if (cachedMsg && cachedMsg.message) {
                    const sender = cachedMsg.key.participant || cachedMsg.key.remoteJid
                    const myJid = conn.user.id.split(':')[0] + '@s.whatsapp.net'
                    const type = Object.keys(cachedMsg.message)[0]
                    const report = `🛡️ *Mantra Anti-Delete*\n\n👤 *From:* @${sender.split('@')[0]}\n📍 *Chat:* ${key.remoteJid.split('@')[0]}\n📝 *Content:* ${cachedMsg.message.conversation || 'Media message'}`
                    await conn.sendMessage(myJid, { text: report, mentions: [sender] })
                    if (type === 'imageMessage' || type === 'videoMessage') {
                        await conn.sendMessage(myJid, { [type.replace('Message', '')]: cachedMsg.message[type], caption: `🖼️ Recovered Media from @${sender.split('@')[0]}`, mentions: [sender] })
                    }
                }
            }
        }
    })

    conn.ev.on('creds.update', saveCreds)

    // Plugin Loader
    const plugins = new Map()
    const files = await fs.readdir(path.join(__dirname, 'plugins'))
    for (const file of files) {
        if (file.endsWith('.js')) {
            const p = await import(`file://${path.join(__dirname, 'plugins', file)}`)
            if (p.default?.cmd) plugins.set(p.default.cmd.toLowerCase(), p.default)
        }
    }

    // --- ⌨️ MESSAGE HANDLER WITH AUTO-TYPING ---
    conn.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0]
        if (!m.message || (Math.floor(Date.now() / 1000) - Number(m.messageTimestamp) > 10)) return
        
        const msg = smsg(conn, m)
        const prefix = global.prefa.find(p => msg.body.startsWith(p))
        if (!prefix) return

        const args = msg.body.slice(prefix.length).trim().split(/ +/)
        const command = args.shift().toLowerCase()

        if (plugins.has(command)) {
            // ⌨️ Start Typing...
            await conn.sendPresenceUpdate('composing', m.key.remoteJid)
            
            try {
                await plugins.get(command).run(conn, msg, args, args.join(' '))
            } catch (err) {
                console.error(`❌ Plugin Error:`, err)
            } finally {
                // Stop Typing (set back to available)
                await conn.sendPresenceUpdate('paused', m.key.remoteJid)
            }
        }
    })
}

startMantra()
