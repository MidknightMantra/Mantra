import './config.js'
import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs/promises'
import pino from 'pino'
import { smsg } from './lib/simple.js'

const require = createRequire(import.meta.url)
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, makeInMemoryStore } = require('@whiskeysockets/baileys')

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const store = makeInMemoryStore({ logger: pino({ level: 'silent' }) })

async function startMantra() {
    const sessionDir = './session'
    await fs.mkdir(sessionDir, { recursive: true })

    // Restore Session from Env
    const credsPath = path.join(sessionDir, 'creds.json')
    if (!(await fs.stat(credsPath).catch(() => false)) && global.sessionId) {
        console.log('🔒 SESSION_ID found. Rebuilding creds.json...')
        const base64Data = global.sessionId.split('Mantra~')[1] || global.sessionId
        await fs.writeFile(credsPath, Buffer.from(base64Data, 'base64').toString('utf-8'))
    }

    const { state, saveCreds } = await useMultiFileAuthState(sessionDir)
    const conn = makeWASocket({ logger: pino({ level: 'silent' }), auth: state, browser: ['Mantra', 'Chrome', '1.0.0'] })

    store.bind(conn.ev)
    conn.ev.on('creds.update', saveCreds)

    // Load Plugins
    const plugins = new Map()
    const files = await fs.readdir(path.join(__dirname, 'plugins'))
    for (const file of files) {
        if (file.endsWith('.js')) {
            const plugin = await import(`file://${path.join(__dirname, 'plugins', file)}`)
            if (plugin.default?.cmd) plugins.set(plugin.default.cmd, plugin.default)
        }
    }

    conn.ev.on('connection.update', (update) => {
        if (update.connection === 'open') console.log('✅ Mantra Connected!')
        if (update.connection === 'close') startMantra()
    })

    conn.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0]
        if (!m.message) return
        const msg = smsg(conn, m)
        if (!msg.body) return

        // --- 🕵️ DEBUG LOGS ---
        console.log(`📩 [MSG] From: ${msg.sender} | Body: ${msg.body}`)

        const prefix = global.prefa.find(p => msg.body.startsWith(p))
        if (!prefix) {
            console.log(`⏩ [SKIP] No valid prefix found for: "${msg.body}"`)
            return
        }

        const args = msg.body.slice(prefix.length).trim().split(/ +/)
        const command = args.shift().toLowerCase()

        if (plugins.has(command)) {
            console.log(`🚀 [EXEC] Running command: ${command}`)
            await plugins.get(command).run(conn, msg, args)
        } else {
            console.log(`❓ [UNKNOWN] Command not found: ${command}`)
        }
    })
}

startMantra()
