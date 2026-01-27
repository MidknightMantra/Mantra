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
const store = makeInMemoryStore({ logger: pino({ level: 'silent' }).child({ name: 'store' }) })

// --- 🔄 AUTO-RESTART (24h) ---
const RESTART_INTERVAL = 24 * 60 * 60 * 1000 
setTimeout(() => {
    console.log('♻️ Scheduled Restart: Refreshing RAM and connection...')
    process.exit(0) 
}, RESTART_INTERVAL)

async function startMantra() {
    const sessionDir = './session'
    await fs.mkdir(sessionDir, { recursive: true })

    // --- 🔑 SESSION INJECTION ---
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
        printQRInTerminal: true,
        browser: ['Mantra', 'Chrome', '1.0.0'],
        markOnlineOnConnect: true
    })

    store.bind(conn.ev)

    conn.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update
        if (connection === 'open') {
            console.log('✅ Mantra Connected!')
            console.log('🛡️ Anti-Delete & Message Store: ACTIVE')
        }
        if (connection === 'close') {
            const reason = lastDisconnect?.error?.output?.statusCode
            if (reason !== DisconnectReason.loggedOut) startMantra()
        }
    })

    conn.ev.on('creds.update', saveCreds)

    // 3. Plugin Loader
    const plugins = new Map()
    const loadPlugins = async () => {
        const files = await fs.readdir(path.join(__dirname, 'plugins'))
        for (const file of files) {
            if (file.endsWith('.js')) {
                const plugin = await import(`file://${path.join(__dirname, 'plugins', file)}?v=${Date.now()}`)
                if (plugin.default?.cmd) plugins.set(plugin.default.cmd.toLowerCase(), plugin.default)
            }
        }
        console.log(`🔌 Loaded ${plugins.size} plugins.`)
    }
    await loadPlugins()

    // 4. Message Handler
    conn.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0]
        if (!m.message) return

        // --- ⏰ 10-SECOND ANTI-GHOST FILTER ---
        const currentTime = Math.floor(Date.now() / 1000)
        const msgTime = Number(m.messageTimestamp)
        if (currentTime - msgTime > 10) return 

        const msg = smsg(conn, m)
        if (!msg.body) return

        console.log(`📩 [MSG] ${msg.sender}: ${msg.body}`)

        const prefix = global.prefa.find(p => msg.body.startsWith(p))
        if (!prefix) return

        const args = msg.body.slice(prefix.length).trim().split(/ +/)
        const command = args.shift().toLowerCase()

        if (plugins.has(command)) {
            console.log(`🚀 [EXEC] ${command}`)
            try {
                await plugins.get(command).run(conn, msg, args, args.join(' '))
            } catch (err) {
                console.error(`❌ Plugin Error:`, err)
            }
        }
    })
}

process.on('uncaughtException', console.error)
startMantra()
