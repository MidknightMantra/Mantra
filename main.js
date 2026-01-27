import './config.js'
import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs/promises'
import pino from 'pino'
import { smsg } from './lib/simple.js'

// 1. Setup ESM/CommonJS bridge
const require = createRequire(import.meta.url)
const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason, 
    makeInMemoryStore,
    fetchLatestBaileysVersion,
    getContentType
} = require('@whiskeysockets/baileys')

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// 2. Initialize Store
const store = makeInMemoryStore({ logger: pino({ level: 'silent' }).child({ name: 'store' }) })

async function startMantra() {
    const sessionDir = './session'
    await fs.mkdir(sessionDir, { recursive: true })

    // --- 🔑 SESSION ID INJECTION ---
    const credsPath = path.join(sessionDir, 'creds.json')
    const credsExist = await fs.stat(credsPath).catch(() => false)

    if (!credsExist && global.sessionId) {
        console.log('🔒 SESSION_ID found in env. Rebuilding credentials...')
        try {
            const base64Data = global.sessionId.split('Mantra~')[1] || global.sessionId
            await fs.writeFile(credsPath, Buffer.from(base64Data, 'base64').toString('utf-8'))
            console.log('✅ credentials restored.')
        } catch (e) {
            console.error('❌ SESSION_ID restoration failed:', e.message)
        }
    }

    const { state, saveCreds } = await useMultiFileAuthState(sessionDir)
    
    // Get latest WA version to prevent "Old Version" warnings
    let { version } = await fetchLatestBaileysVersion().catch(() => ({ version: [2, 3000, 1015901307] }))

    const conn = makeWASocket({
        logger: pino({ level: 'silent' }),
        auth: state,
        version,
        printQRInTerminal: true,
        browser: ['Mantra', 'Chrome', '1.0.0'],
        generateHighQualityLinkPreview: true,
        markOnlineOnConnect: true
    })

    // Bind store for Anti-Delete tracking
    store.bind(conn.ev)

    // Connection Manager
    conn.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update
        if (connection === 'open') {
            console.log('✅ Mantra Connected!')
            console.log('🛡️ Anti-Delete & Message Store: ACTIVE')
        }
        if (connection === 'close') {
            const reason = lastDisconnect?.error?.output?.statusCode
            console.log(`🔌 Connection closed (Code: ${reason})`)
            if (reason !== DisconnectReason.loggedOut) {
                console.log('🔄 Reconnecting...')
                startMantra()
            }
        }
    })

    conn.ev.on('creds.update', saveCreds)

    // 3. Plugin Loader
    const plugins = new Map()
    const loadPlugins = async () => {
        try {
            const pluginFolder = path.join(__dirname, 'plugins')
            const files = await fs.readdir(pluginFolder)
            for (const file of files) {
                if (file.endsWith('.js')) {
                    const plugin = await import(`file://${path.join(pluginFolder, file)}?v=${Date.now()}`)
                    if (plugin.default?.cmd) {
                        plugins.set(plugin.default.cmd.toLowerCase(), plugin.default)
                        console.log(`🔌 Loaded plugin: ${plugin.default.cmd}`)
                    }
                }
            }
            console.log(`✅ Loaded ${plugins.size} total plugins.`)
        } catch (e) {
            console.error('Plugin Loading Error:', e.message)
        }
    }
    await loadPlugins()

    // 4. Message Handler
    conn.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0]
        if (!m.message) return

        // --- ⏰ 10-SECOND ANTI-GHOST FILTER ---
        const currentTime = Math.floor(Date.now() / 1000)
        const msgTime = Number(m.messageTimestamp)
        if (currentTime - msgTime > 10) {
            // Skips old messages that sync during startup
            return 
        }

        const msg = smsg(conn, m)
        if (!msg.body) return

        // RAILWAY LOG: See incoming commands
        console.log(`📩 [MSG] ${msg.sender}: ${msg.body}`)

        // Command Extraction
        const prefix = global.prefa.find(p => msg.body.startsWith(p))
        if (!prefix) return

        const args = msg.body.slice(prefix.length).trim().split(/ +/)
        const command = args.shift().toLowerCase()

        if (plugins.has(command)) {
            console.log(`🚀 [EXEC] Running: ${command}`)
            try {
                await plugins.get(command).run(conn, msg, args)
            } catch (err) {
                console.error(`❌ Plugin Error (${command}):`, err)
                msg.reply(`❌ Error executing ${command}`)
            }
        }
    })
}

// Global Process Management
process.on('uncaughtException', console.error)
process.on('unhandledRejection', console.error)

startMantra()
