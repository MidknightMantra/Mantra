import './config.js'
import path from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'
import pino from 'pino'
import fs from 'fs/promises'
import { smsg } from './lib/simple.js'
import { downloadMedia } from './lib/media.js'

// 1. Setup require for ESM bridge
const require = createRequire(import.meta.url)

// 2. Load Baileys and extract exports safely
const baileys = require('@whiskeysockets/baileys')
const makeWASocket = baileys.default || baileys
const { 
  useMultiFileAuthState, 
  DisconnectReason, 
  fetchLatestBaileysVersion 
} = baileys

// 3. Robust Store Extraction for v7-rc.9
let makeInMemoryStore = baileys.makeInMemoryStore
if (typeof makeInMemoryStore !== 'function') {
    try {
        // v7 release candidates often require reaching into the lib folder
        const { makeInMemoryStore: storeFunc } = require('@whiskeysockets/baileys/lib/Store/make-in-memory-store')
        makeInMemoryStore = storeFunc
    } catch {
        try {
            const { makeInMemoryStore: altStoreFunc } = require('@whiskeysockets/baileys/lib/Utils')
            makeInMemoryStore = altStoreFunc
        } catch (e) {
            makeInMemoryStore = null
        }
    }
}

// ESM paths
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 4. Initialize Store
const store = typeof makeInMemoryStore === 'function' 
  ? makeInMemoryStore({ logger: pino({ level: 'silent' }).child({ name: 'store' }) }) 
  : null

// Verification logging
if (store) {
  console.log('🛡️ Anti-Delete & Message Store: ACTIVE')
} else {
  console.log('⚠️ Warning: Message Store failed to initialize. Anti-delete will be limited.')
}

const msgRetryMap = new Map()
let pluginsLoaded = false 

// ViewOnce unwrap helper
function unwrapViewOnce(msg) {
  if (!msg) return null
  let current = msg
  while (current) {
    if (current.viewOnceMessage?.message) current = current.viewOnceMessage.message
    else if (current.viewOnceMessageV2?.message) current = current.viewOnceMessageV2.message
    else if (current.viewOnceMessageV2Extension?.message) current = current.viewOnceMessageV2Extension.message
    else break
  }
  return current
}

async function startMantra() {
  try {
    const sessionDir = global.sessionName || './session'
    await fs.mkdir(sessionDir, { recursive: true })

    const credsPath = path.join(sessionDir, 'creds.json')
    const credsExists = await fs.stat(credsPath).catch(() => false)

    if (!credsExists && global.sessionId) {
      console.log('🔒 Injecting session from env...')
      const parts = global.sessionId.split('Mantra~')
      if (parts[1]) {
        const decoded = Buffer.from(parts[1], 'base64').toString('utf-8')
        await fs.writeFile(credsPath, decoded)
      }
    }

    const { state, saveCreds } = await useMultiFileAuthState(sessionDir)
    
    // Handshake settings
    let version = [2, 3000, 1015901307]
    try {
      const v = await fetchLatestBaileysVersion()
      version = v.version
      console.log('Fetched latest version:', version)
    } catch (e) {
      console.warn('Version fetch failed, using fallback:', e.message)
    }

    const conn = makeWASocket({
      logger: pino({ level: 'silent' }),
      auth: state,
      version,
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 0,
      keepAliveIntervalMs: 15000,
      emitOwnEvents: true,
      fireInitQueries: true,
      generateHighQualityLinkPreview: true,
      syncFullHistory: true,
      markOnlineOnConnect: true,
      browser: ['Mantra', 'Chrome', '1.0.0'],
      shouldReconnect: (lastError) => {
        const status = lastError?.output?.statusCode
        return status !== DisconnectReason.loggedOut && status !== 408 
      },
    })

    // Bind store to connection for message tracking
    if (store) store.bind(conn.ev)

    let myJid = null
    conn.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect } = update
      if (connection === 'open') {
        setTimeout(async () => {
          myJid = conn.user?.jid || conn.user?.id?.split(':')[0] + '@s.whatsapp.net'
          console.log('✅ Mantra Connected! Bot JID:', myJid)
          console.log(`👀 Auto-Status Read: ${global.autoStatusRead ? 'ON' : 'OFF'}`)
          console.log(`🗑️ Anti-Delete: ${global.antiDelete ? 'ON' : 'OFF'}`)
          console.log(`🕵️ Anti-ViewOnce: ${global.antiViewOnce ? 'ON' : 'OFF'}`)

          if (global.alwaysOnline) {
            setInterval(() => conn.sendPresenceUpdate('available'), 10000)
          }
        }, 2000)
      } else if (connection === 'close') {
        const status = lastDisconnect?.error?.output?.statusCode
        console.log(`Connection closed (code: ${status})`)
        if (status !== DisconnectReason.loggedOut) {
          const delay = status === 408 ? 10000 : 5000
          console.log(`🔄 Reconnecting in ${delay/1000} seconds...`)
          setTimeout(startMantra, delay)
        }
      }
    })

    conn.ev.on('creds.update', saveCreds)

    const pluginFolder = path.join(__dirname, 'plugins')
    const plugins = new Map()

    const loadPlugins = async () => {
      if (pluginsLoaded) return
      try {
        const files = await fs.readdir(pluginFolder)
        for (const file of files) {
          if (!file.endsWith('.js')) continue
          const pluginPath = path.join(pluginFolder, file)
          try {
            const plugin = await import(`file://${pluginPath}`)
            const cmdPlugin = plugin.default
            if (cmdPlugin?.cmd) {
              plugins.set(cmdPlugin.cmd.toLowerCase(), cmdPlugin)
              console.log(`Loaded plugin: ${cmdPlugin.cmd}`)
            }
          } catch (e) {
            console.error(`Failed loading plugin ${file}:`, e.message)
          }
        }
        console.log(`🔌 Loaded ${plugins.size} plugins`)
        pluginsLoaded = true
      } catch (e) {
        console.error('Plugin folder error:', e.message)
      }
    }

    await loadPlugins()

    conn.ev.on('messages.upsert', async (chatUpdate) => {
      if (chatUpdate.type === 'append') return
      const m = chatUpdate.messages[0]
      if (!m?.message) return

      const msgTime = m.messageTimestamp?.low ?? m.messageTimestamp ?? 0
      if (Date.now() / 1000 - msgTime > 30) return
      if (!myJid) return

      // --- STATUS AUTO-READ ---
      if (m.key.remoteJid === 'status@broadcast') {
        if (global.autoStatusRead) await conn.readMessages([m.key]).catch(() => {})
        return
      }

      // --- ANTI-DELETE LOGIC ---
      if (global.antiDelete && m.message.protocolMessage?.type === 5 && store) {
        const key = m.message.protocolMessage.key
        try {
          const deletedMsg = await store.loadMessage(key.remoteJid, key.id)
          if (!deletedMsg?.message) return
          const participant = deletedMsg.key?.participant || deletedMsg.participant || key.remoteJid
          const caption = `🗑️ *Deleted Message*\nFrom: @${participant.split('@')[0]}`
          
          if (deletedMsg.message.conversation || deletedMsg.message.extendedTextMessage) {
            const text = deletedMsg.message.conversation || deletedMsg.message.extendedTextMessage.text
            await conn.sendMessage(myJid, { text: `${caption}\n\n${text}`, mentions: [participant] })
          } else {
            const type = Object.keys(deletedMsg.message)[0]
            const buffer = await downloadMedia({ msg: deletedMsg.message[type], mtype: type.replace('Message', '') }).catch(() => null)
            if (buffer) await conn.sendMessage(myJid, { [type.replace('Message', '')]: buffer, caption, mentions: [participant] })
          }
        } catch (err) { console.error('Anti-delete error:', err.message) }
        return
      }

      if (msgRetryMap.has(m.key.id)) return
      msgRetryMap.set(m.key.id, true)
      setTimeout(() => msgRetryMap.delete(m.key.id), 5000)

      // --- ANTI-VIEWONCE ---
      if (global.antiViewOnce && !m.key.fromMe) {
        const unwrapped = unwrapViewOnce(m.message)
        const media = unwrapped?.imageMessage || unwrapped?.videoMessage
        if (media) {
          const type = unwrapped.imageMessage ? 'image' : 'video'
          const buffer = await downloadMedia({ msg: media, mtype: type + 'Message' }).catch(() => null)
          if (buffer) await conn.sendMessage(myJid, { [type]: buffer, caption: '🕵️ ViewOnce Captured' })
        }
      }

      // --- COMMAND HANDLER ---
      m.message = m.message.ephemeralMessage?.message || m.message
      const msg = smsg(conn, m)
      if (!msg.body) return

      const prefix = global.prefa?.find(p => msg.body.startsWith(p)) || ''
      const isCmd = !!prefix && msg.body.startsWith(prefix)
      const command = isCmd ? msg.body.slice(prefix.length).trim().split(' ')[0].toLowerCase() : ''
      const args = msg.body.trim().split(/ +/).slice(1)

      if (isCmd && plugins.has(command)) {
        try {
          await plugins.get(command).run(conn, msg, args, args.join(' '))
        } catch (err) {
          console.error(`Plugin error (${command}):`, err.message)
          await msg.reply('❌ Error executing command.')
        }
      }
    })
  } catch (err) {
    console.error('Fatal startup error:', err.message)
    setTimeout(startMantra, 15000)
  }
}

process.on('uncaughtException', err => console.error('Uncaught Exception:', err))
process.on('unhandledRejection', (reason) => console.error('Unhandled Rejection:', reason))

startMantra()
