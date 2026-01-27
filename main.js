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
    const { state, saveCreds } = await useMultiFileAuthState('./session')
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
    const files = await fs.readdir(path.join(__dirname, 'plugins'))
    for (const file of files) {
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

        // RAILWAY DEBUG LOG
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
