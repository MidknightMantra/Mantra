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
        getMessage: async (key) => {
            if (store) return (await store.loadMessage(key.remoteJid, key.id))?.message || undefined
            return { conversation: 'Message not found in store' }
        }
    })

    store.bind(conn.ev)

    // --- 🛡️ ANTI-DELETE LOGIC ---
    conn.ev.on('messages.update', async (chatUpdate) => {
        for (const { key, update } of chatUpdate) {
            if (update.protocolMessage && update.protocolMessage.type === 0) {
                const msgId = update.protocolMessage.key.id
                const cachedMsg = await store.loadMessage(key.remoteJid, msgId)

                if (cachedMsg && cachedMsg.message) {
                    const sender = cachedMsg.key.participant || cachedMsg.key.remoteJid
                    const myJid = conn.user.id.split(':')[0] + '@s.whatsapp.net'
                    const type = Object.keys(cachedMsg.message)[0]
                    
                    const report = `🛡️ *Mantra Anti-Delete*\n\n👤 *From:* @${sender.split('@')[0]}\n📍 *Chat:* ${key.remoteJid.split('@')[0]}\n📝 *Content:* ${cachedMsg.message.conversation || 'Media message below'}`

                    await conn.sendMessage(myJid, { text: report, mentions: [sender] })
                    
                    if (type === 'imageMessage' || type === 'videoMessage') {
                        await conn.sendMessage(myJid, { 
                            [type.replace('Message', '')]: cachedMsg.message[type],
                            caption: `🖼️ Recovered Media from @${sender.split('@')[0]}`,
                            mentions: [sender]
                        })
                    }
                }
            }
        }
    })

    conn.ev.on('connection.update', (up) => {
        if (up.connection === 'open') console.log('✅ Mantra Connected!')
        if (up.connection === 'close' && up.lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) startMantra()
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

    conn.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0]
        if (!m.message || (Math.floor(Date.now() / 1000) - Number(m.messageTimestamp) > 10)) return
        
        const msg = smsg(conn, m)
        const prefix = global.prefa.find(p => msg.body.startsWith(p))
        if (!prefix) return

        const args = msg.body.slice(prefix.length).trim().split(/ +/)
        const command = args.shift().toLowerCase()

        if (plugins.has(command)) {
            await plugins.get(command).run(conn, msg, args, args.join(' '))
        }
    })
}

startMantra()
