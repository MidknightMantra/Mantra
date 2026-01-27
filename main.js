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
    makeInMemoryStore 
} = require('@whiskeysockets/baileys')

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const store = makeInMemoryStore({ logger: pino({ level: 'silent' }) })

async function startMantra() {
    const sessionDir = './session'
    await fs.mkdir(sessionDir, { recursive: true })

    // --- 🔑 SESSION ID INJECTION ---
    const credsPath = path.join(sessionDir, 'creds.json')
    if (!(await fs.stat(credsPath).catch(() => false)) && global.sessionId) {
        console.log('🔒 Session ID detected. Rebuilding creds.json...')
        try {
            // Logic to handle "Mantra~" prefix often used in session strings
            const base64Data = global.sessionId.includes('Mantra~') 
                ? global.sessionId.split('Mantra~')[1] 
                : global.sessionId
            
            const decodedCreds = Buffer.from(base64Data, 'base64').toString('utf-8')
            await fs.writeFile(credsPath, decodedCreds)
            console.log('✅ creds.json restored successfully.')
        } catch (e) {
            console.error('❌ Failed to decode SESSION_ID:', e.message)
        }
    }

    const { state, saveCreds } = await useMultiFileAuthState(sessionDir)
    
    const conn = makeWASocket({
        logger: pino({ level: 'silent' }),
        auth: state,
        printQRInTerminal: true,
        browser: ['Mantra', 'Chrome', '1.0.0']
    })

    store.bind(conn.ev)
    conn.ev.on('creds.update', saveCreds)

    // Plugin Handler
    const plugins = new Map()
    const pluginFiles = await fs.readdir(path.join(__dirname, 'plugins'))
    for (const file of pluginFiles) {
        if (file.endsWith('.js')) {
            const plugin = await import(`file://${path.join(__dirname, 'plugins', file)}`)
            if (plugin.default?.cmd) plugins.set(plugin.default.cmd, plugin.default)
        }
    }

    conn.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update
        if (connection === 'open') console.log('✅ Mantra Connected!')
        if (connection === 'close') {
            const reason = lastDisconnect?.error?.output?.statusCode
            if (reason !== DisconnectReason.loggedOut) startMantra()
        }
    })

    conn.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0]
        if (!m.message) return
        const msg = smsg(conn, m)

        console.log(`📩 [MSG] ${msg.sender}: ${msg.body}`)

        const prefix = global.prefa.find(p => msg.body.startsWith(p))
        if (!prefix) return

        const args = msg.body.slice(prefix.length).trim().split(/ +/)
        const command = args.shift().toLowerCase()

        if (plugins.has(command)) {
            console.log(`🚀 [EXEC] ${command}`)
            await plugins.get(command).run(conn, msg, args)
        }
    })
}

startMantra()
