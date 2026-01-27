import './config.js'
import path from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'
import pino from 'pino'
import fs from 'fs/promises'
import { smsg } from './lib/simple.js'
import { downloadMedia } from './lib/media.js'

const require = createRequire(import.meta.url)
const { 
  default: makeWASocket, 
  useMultiFileAuthState, 
  DisconnectReason, 
  fetchLatestBaileysVersion,
  makeInMemoryStore 
} = require('@whiskeysockets/baileys')

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const store = makeInMemoryStore({ logger: pino({ level: 'silent' }).child({ name: 'store' }) })
if (store) console.log('🛡️ Anti-Delete & Message Store: ACTIVE')

const msgRetryMap = new Map()
let pluginsLoaded = false 

async function startMantra() {
  try {
    const sessionDir = './session'
    await fs.mkdir(sessionDir, { recursive: true })
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir)
    
    const conn = makeWASocket({
      logger: pino({ level: 'silent' }),
      auth: state,
      browser: ['Mantra', 'Chrome', '1.0.0'],
      syncFullHistory: true,
      markOnlineOnConnect: true,
    })

    if (store) store.bind(conn.ev)

    let myJid = null
    conn.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect } = update
      if (connection === 'open') {
        myJid = conn.user.id.split(':')[0] + '@s.whatsapp.net'
        console.log('✅ Mantra Connected! Bot JID:', myJid)
      } else if (connection === 'close') {
        const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut
        if (shouldReconnect) startMantra()
      }
    })

    conn.ev.on('creds.update', saveCreds)

    // Plugin Loader
    const plugins = new Map()
    const loadPlugins = async () => {
      if (pluginsLoaded) return
      const pluginFolder = path.join(__dirname, 'plugins')
      const files = await fs.readdir(pluginFolder)
      for (const file of files) {
        if (!file.endsWith('.js')) continue
        const plugin = await import(`file://${path.join(pluginFolder, file)}`)
        if (plugin.default?.cmd) plugins.set(plugin.default.cmd.toLowerCase(), plugin.default)
      }
      pluginsLoaded = true
      console.log(`🔌 Loaded ${plugins.size} plugins`)
    }
    await loadPlugins()

    conn.ev.on('messages.upsert', async (chatUpdate) => {
      const m = chatUpdate.messages[0]
      if (!m?.message) return
      const msg = smsg(conn, m)
      if (!msg.body) return

      // --- LOG EVERY MESSAGE FOR DEBUGGING ---
      console.log(`📩 [MSG] From: ${msg.sender} | Body: ${msg.body}`)

      // Prefix Logic
      const prefix = global.prefa.find(p => msg.body.startsWith(p)) || ''
      const isCmd = !!prefix
      const command = isCmd ? msg.body.slice(prefix.length).trim().split(' ')[0].toLowerCase() : ''
      const args = msg.body.trim().split(/ +/).slice(1)
      const text = args.join(' ')

      if (isCmd) {
        console.log(`🔍 [CMD] Attempting: ${command}`)
        if (plugins.has(command)) {
          try {
            await plugins.get(command).run(conn, msg, args, text)
            console.log(`✅ [SUCCESS] Executed: ${command}`)
          } catch (e) {
            console.error(`❌ [ERROR] Plugin ${command}:`, e.message)
          }
        } else {
          console.log(`❓ [UNKNOWN] Command not found: ${command}`)
        }
      }
    })
  } catch (err) {
    console.error('Critical Error:', err)
    setTimeout(startMantra, 5000)
  }
}

startMantra()
