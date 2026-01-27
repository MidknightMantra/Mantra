import './config.js'
import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs/promises'
import pino from 'pino'
import { smsg } from './lib/simple.js'

// 1. ESM/CommonJS Bridge
const require = createRequire(import.meta.url)
const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason, 
    makeInMemoryStore,
    fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys')

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// 2. Initialize Store (The bot's memory)
const store = makeInMemoryStore({ logger: pino({ level: 'silent' }).child({ name: 'store' }) })

// --- 🔄 AUTO-RESTART (24h) ---
setTimeout(() => process.exit(0), 24 * 60 * 60 * 1000)

async function startMantra() {
    const sessionDir = './session'
    await fs.mkdir(sessionDir, { recursive: true })

    // Restore Session from Env
    const credsPath = path.join(sessionDir, 'creds.json')
    if (!(await fs.stat(credsPath).catch(() => false)) && global.sessionId) {
        console.log('🔒 SESSION_ID found. Restoring credentials...')
        try {
            const base64Data = global.sessionId.split('Mantra~')[1] || global.sessionId
            await fs.writeFile(credsPath, Buffer.from(base64Data, 'base64').toString('utf-8'))
        } catch (e) { console.error('❌ Session restoration failed:', e.message) }
    }

    const { state, saveCreds } = await useMultiFileAuthState(sessionDir)
    let { version } = await fetchLatestBaileysVersion().catch(() => ({ version: [2, 3000, 1015901307] }))

    const conn = makeWASocket({
        logger: pino({ level: 'silent' }),
        auth: state,
        version,
        browser: ['Mantra', 'Chrome', '1.0.0'],
        markOnlineOnConnect: true,
        // 🛠️ CRITICAL: Allows Anti-Delete to "look back" at old messages
        getMessage: async (key) => {
            if (store) {
                const msg = await store.loadMessage(key.remoteJid, key.id)
                return msg?.message || undefined
            }
            return { conversation: "Mantra: Store not ready" }
        }
    })

    // Bind store to the connection
    store.bind(conn.ev)

    // --- 🛡️ ANTI-DELETE LOGIC ---
    conn.ev.on('messages.update', async (chatUpdate) => {
        for (const { key, update } of chatUpdate) {
            // protocolMessage type 0 = REVOKE (Delete for Everyone)
            if (update.protocolMessage && update.protocolMessage.type === 0) {
                const msgId = update.protocolMessage.key.id
                const chatJid = key.remoteJid
                
                // Load original message from RAM
                const cachedMsg = await store.loadMessage(chatJid, msgId)

                if (cachedMsg && cachedMsg.message) {
                    const sender = cachedMsg.key.participant || cachedMsg.key.remoteJid
                    const myJid = conn.user.id.split(':')[0] + '@s.whatsapp.net'
                    const type = Object.keys(cachedMsg.message)[0]
                    
                    const textContent = cachedMsg.message.conversation || 
                                        cachedMsg.message.extendedTextMessage?.text || 
                                        cachedMsg.message[type]?.caption || "Media/Attachment"

                    const report = `🛡️ *Mantra Anti-Delete*\n\n👤 *From:* @${sender.split('@')[0]}\n📍 *Chat:* ${chatJid.split('@')[0]}\n📝 *Content:* ${textContent}`

                    // Send to Saved Messages
                    await conn.sendMessage(myJid, { text: report, mentions: [sender] })
                    
                    if (type === 'imageMessage' || type === 'videoMessage') {
                        await conn.sendMessage(myJid, { 
                            [type.replace('Message', '')]: cachedMsg.message[type],
                            caption: `🖼️ Deleted media from @${sender.split('@')[0]}`,
                            mentions: [sender]
                        })
                    }
                    console.log(`🛡️ Recovered message for ${myJid}`)
                }
            }
        }
    })

    conn.ev.on('connection.update', (up) => {
        if (up.connection === 'open') console.log('✅ Mantra Connected!')
        if (up.connection === 'close' && up.lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) startMantra()
    })

    conn.ev.on('creds.update', saveCreds)

    // 3. Plugin Loader
    const plugins = new Map()
    const files = await fs.readdir(path.join(__dirname, 'plugins'))
    for (const file of files) {
        if (file.endsWith('.js')) {
            const p = await import(`file://${path.join(__dirname, 'plugins', file)}?v=${Date.now()}`)
            if (p.default?.cmd) plugins.set(p.default.cmd.toLowerCase(), p.default)
        }
    }

    // 4. Message Handler
    conn.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0]
        if (!m.message) return
        
        // 10-Second Anti-Ghost Filter
        const currentTime = Math.floor(Date.now() / 1000)
        if (currentTime - Number(m.messageTimestamp) > 10) return
        
        const msg = smsg(conn, m)
        const prefix = global.prefa.find(p => msg.body.startsWith(p))
        if (!prefix) return

        const args = msg.body.slice(prefix.length).trim().split(/ +/)
        const command = args.shift().toLowerCase()

        if (plugins.has(command)) {
            try {
                await plugins.get(command).run(conn, msg, args, args.join(' '))
            } catch (err) { console.error(`❌ Plugin Error (${command}):`, err) }
        }
    })
}

startMantra()
