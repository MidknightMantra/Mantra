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

// --- ⚙️ PLUGIN ENGINE ---
global.plugins = new Map()

async function loadPlugins() {
    const pluginsDir = path.join(__dirname, 'plugins')
    try {
        await fs.mkdir(pluginsDir, { recursive: true })
        const files = await fs.readdir(pluginsDir)
        
        for (const file of files) {
            if (file.endsWith('.js')) {
                try {
                    // Import with a timestamp to allow for potential reloading without cache issues
                    const plugin = await import(`file://${path.join(pluginsDir, file)}?v=${Date.now()}`)
                    const p = plugin.default
                    
                    if (p && p.run) {
                        // Support both single strings and arrays for commands
                        const triggers = Array.isArray(p.cmd) ? p.cmd : [p.cmd]
                        triggers.forEach(t => global.plugins.set(t.toLowerCase(), p))
                    }
                } catch (err) {
                    console.error(`❌ Error loading plugin ${file}:`, err)
                }
            }
        }
        console.log(`📦 Loaded ${global.plugins.size} command triggers.`)
    } catch (err) {
        console.error('❌ Plugin Directory Error:', err)
    }
}

// --- 🔄 AUTO-RESTART (24h) ---
setTimeout(() => process.exit(0), 24 * 60 * 60 * 1000)

async function startMantra() {
    const sessionDir = './session'
    await fs.mkdir(sessionDir, { recursive: true })

    // Restore Session Logic
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
        markOnlineOnConnect: true,
        getMessage: async (key) => {
            if (store) return (await store.loadMessage(key.remoteJid, key.id))?.message || undefined
            return { conversation: "Mantra: Store not ready" }
        }
    })

    store.bind(conn.ev)
    await loadPlugins() // 🚀 Load plugins on startup

    // --- 🟢 CONNECTION HANDLER ---
    conn.ev.on('connection.update', (up) => {
        const { connection, lastDisconnect } = up
        if (connection === 'open') {
            console.log('✅ Mantra Connected & Always Online!')
            setInterval(async () => {
                await conn.sendPresenceUpdate('available')
            }, 15000)
        }
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
            if (shouldReconnect) startMantra()
        }
    })

    // --- 🛡️ ANTI-DELETE ---
    conn.ev.on('messages.update', async (chatUpdate) => {
        for (const { key, update } of chatUpdate) {
            if (update.protocolMessage && update.protocolMessage.type === 0) {
                const msgId = update.protocolMessage.key.id
                const cachedMsg = await store.loadMessage(key.remoteJid, msgId)
                if (cachedMsg?.message) {
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

    // --- ⌨️ UNIVERSAL MESSAGE HANDLER ---
    conn.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0]
        if (!m.message || (Math.floor(Date.now() / 1000) - Number(m.messageTimestamp) > 10)) return
        
        const msg = smsg(conn, m)
        const prefix = global.prefa.find(p => msg.body.startsWith(p))
        if (!prefix) return

        const args = msg.body.slice(prefix.length).trim().split(/ +/)
        const command = args.shift().toLowerCase()
        const plugin = global.plugins.get(command)

        if (plugin) {
            // Visual feedback: Start Typing
            await conn.sendPresenceUpdate('composing', m.key.remoteJid)
            
            try {
                // Execute the plugin's "run" function
                await plugin.run(conn, msg, { 
                    args, 
                    text: args.join(' '), 
                    command, 
                    prefix 
                })
            } catch (err) {
                console.error(`❌ Plugin Error [${command}]:`, err)
                await msg.reply(`⚠️ Error executing *${command}*`)
            } finally {
                // Stop Typing
                await conn.sendPresenceUpdate('paused', m.key.remoteJid)
            }
        }
    })
}

startMantra()
