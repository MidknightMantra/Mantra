import './config.js'
import { createRequire } from 'module'
import path from 'path'
import { fileURLToPath } from 'url'
import pino from 'pino'
import fs from 'fs/promises' // Use promises for better async handling
import { smsg } from './lib/simple.js'
import { downloadMedia } from './lib/media.js'

// --- Robust Baileys Import ---
const require = createRequire(import.meta.url)
const BaileysLib = require('@whiskeysockets/baileys')

// Helper to safely resolve exports (handles default, nested defaults, etc.)
const getExport = (key) => {
  return (
    BaileysLib[key] ||
    BaileysLib.default?.[key] ||
    BaileysLib.default?.default?.[key] ||
    BaileysLib[key]?.default
  )
}

const makeWASocket = getExport('makeWASocket') || BaileysLib.default
const useMultiFileAuthState = getExport('useMultiFileAuthState')
const DisconnectReason = getExport('DisconnectReason')
const fetchLatestBaileysVersion = getExport('fetchLatestBaileysVersion')
let makeInMemoryStore = getExport('makeInMemoryStore')

// Fallback for makeInMemoryStore (some Baileys versions move it)
if (!makeInMemoryStore) {
  try {
    const StoreLib = require('@whiskeysockets/baileys/lib/Store/make-in-memory-store')
    makeInMemoryStore = StoreLib.makeInMemoryStore
  } catch (e) {
    console.warn('⚠️ makeInMemoryStore not found. Anti-delete and message history features will be limited.')
  }
}

// ESM paths
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// --- Store & Retry Map ---
const store = makeInMemoryStore
  ? makeInMemoryStore({ logger: pino({ level: 'silent' }).child({ name: 'store' }) })
  : null

const msgRetryMap = new Map()

if (store) {
  console.log('🛡️ Anti-Delete & Message Store: ACTIVE')
} else {
  console.log('⚠️ Message Store: DISABLED (anti-delete limited)')
}

// Helper to unwrap View Once (used in anti-viewonce & can be reused)
function unwrapViewOnce(msg) {
  if (!msg) return null
  let current = msg

  // Handle known wrappers (recursive unwrap)
  while (current) {
    if (current.viewOnceMessage?.message) {
      current = current.viewOnceMessage.message
      continue
    }
    if (current.viewOnceMessageV2?.message) {
      current = current.viewOnceMessageV2.message
      continue
    }
    if (current.viewOnceMessageV2Extension?.message) {
      current = current.viewOnceMessageV2Extension.message
      continue
    }
    // Future-proof: add more if needed
    break
  }

  return current
}

async function startMantra() {
  try {
    // --- Session Management ---
    const sessionDir = global.sessionName || './session'
    await fs.mkdir(sessionDir, { recursive: true })

    // Railway / Env session injection
    const credsPath = path.join(sessionDir, 'creds.json')
    if (!(await fs.stat(credsPath).catch(() => false)) && global.sessionId) {
      console.log('🔒 Injecting session from env...')
      const sessionParts = global.sessionId.split('Mantra~')
      if (sessionParts[1]) {
        const decoded = Buffer.from(sessionParts[1], 'base64').toString('utf-8')
        await fs.writeFile(credsPath, decoded)
      }
    }

    const { state, saveCreds } = await useMultiFileAuthState(sessionDir)
    const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: [2, 3000, 0] })) // Fallback version

    const conn = makeWASocket({
      logger: pino({ level: 'silent' }),
      auth: state,
      version,
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 0,
      keepAliveIntervalMs: 10000,
      emitOwnEvents: true,
      fireInitQueries: true,
      generateHighQualityLinkPreview: true,
      syncFullHistory: true,
      markOnlineOnConnect: true,
      browser: ['Mantra', 'Chrome', '1.0.0'],
      // Add retry mechanism for transient errors
      shouldReconnect: (lastError) => lastError?.output?.statusCode !== DisconnectReason.loggedOut,
    })

    // Bind store
    if (store) store.bind(conn.ev)

    // --- Connection Handler ---
    conn.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect } = update
      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode
        console.log(`Connection closed: ${statusCode || 'unknown'}`)
        if (statusCode !== DisconnectReason.loggedOut) {
          console.log('🔄 Reconnecting in 5s...')
          setTimeout(startMantra, 5000) // Delay to avoid rapid loops
        } else {
          console.log('❌ Logged out. Delete session and scan QR again.')
        }
      } else if (connection === 'open') {
        console.log('✅ Mantra Connected!')
        console.log(`👀 Auto-Status Read: ${global.autoStatusRead ? 'ON' : 'OFF'}`)
        console.log(`💾 Auto-Status Save: ${global.autoStatusSave ? 'ON' : 'OFF'}`)
        console.log(`🗑️ Anti-Delete: ${global.antiDelete ? 'ON' : 'OFF'}`)
        console.log(`🕵️ Anti-ViewOnce: ${global.antiViewOnce ? 'ON' : 'OFF'}`)

        if (global.alwaysOnline) {
          setInterval(() => conn.sendPresenceUpdate('available'), 10000)
        }
      }
    })

    conn.ev.on('creds.update', saveCreds)

    // --- Plugin Loader with Hot-Reload Support (optional watcher) ---
    const pluginFolder = path.join(__dirname, 'plugins')
    const plugins = new Map()

    const loadPlugins = async () => {
      plugins.clear()
      try {
        const files = await fs.readdir(pluginFolder)
        for (const file of files) {
          if (!file.endsWith('.js')) continue
          const pluginPath = path.join(pluginFolder, file)
          const cacheBust = `?t=${Date.now()}`
          try {
            const plugin = await import(`file://\( {pluginPath} \){cacheBust}`)
            const cmdPlugin = plugin.default
            if (cmdPlugin?.cmd) {
              plugins.set(cmdPlugin.cmd.toLowerCase(), cmdPlugin)
              console.log(`Loaded plugin: ${cmdPlugin.cmd}`)
            }
          } catch (e) {
            console.error(`Failed to load ${file}:`, e.message)
          }
        }
        console.log(`🔌 ${plugins.size} plugins loaded`)
      } catch (e) {
        console.error('Plugin folder error:', e)
      }
    }

    await loadPlugins()

    // Optional: Watch for plugin changes (dev only, comment in production)
    // fs.watch(pluginFolder, { recursive: true }, () => loadPlugins())

    // --- Message Handler ---
    conn.ev.on('messages.upsert', async (chatUpdate) => {
      if (chatUpdate.type === 'append') return // Ignore history sync appends
      const m = chatUpdate.messages[0]
      if (!m.message) return

      // 0. Ignore old messages (>30s) to prevent spam on reconnect
      const msgTime = m.messageTimestamp?.low ?? m.messageTimestamp ?? 0
      if (Date.now() / 1000 - msgTime > 30) return

      // Get bot's own JID (normalized)
      const myJid = conn.user?.id?.split(':')[0] + '@s.whatsapp.net' || conn.user?.jid

      // 1. Status Handler
      if (m.key.remoteJid === 'status@broadcast') {
        if (global.autoStatusRead) {
          await conn.readMessages([m.key]).catch(() => {})
        }

        if (global.autoStatusSave && (m.message.imageMessage || m.message.videoMessage)) {
          const isImage = !!m.message.imageMessage
          const mtype = isImage ? 'imageMessage' : 'videoMessage'
          const type = isImage ? 'image' : 'video'

          try {
            const buffer = await downloadMedia({ msg: m.message[mtype], mtype })
            const senderName = m.pushName || m.key.participant?.split('@')[0] || 'Unknown'
            const caption = `💾 *Status Saver*\nFrom: \( {senderName}\n \){m.message[mtype].caption || ''}`

            await conn.sendMessage(myJid, { [type]: buffer, caption })
          } catch (err) {
            console.error('Status save failed:', err.message)
          }
        }
        return
      }

      // 2. Anti-Delete (fixed to type 5 - REVOKE)
      if (global.antiDelete && m.message.protocolMessage && m.message.protocolMessage.type === 5 && store) {
        const key = m.message.protocolMessage.key
        if (!key?.remoteJid || !key?.id) return

        try {
          const deletedMsg = await store.loadMessage(key.remoteJid, key.id)
          if (!deletedMsg?.message) return

          const participant = deletedMsg.key?.participant || deletedMsg.participant || m.key.participant
          const caption = `🗑️ *Deleted Message*\nFrom: @${participant?.split('@')[0] || 'unknown'}`

          if (deletedMsg.message.conversation || deletedMsg.message.extendedTextMessage?.text) {
            const textContent = deletedMsg.message.conversation || deletedMsg.message.extendedTextMessage.text
            await conn.sendMessage(myJid, {
              text: `\( {caption}\n\n \){textContent}`,
              mentions: [participant],
            })
          } else {
            const msgType = Object.keys(deletedMsg.message)[0]
            const media = deletedMsg.message[msgType]
            const mediaTypes = ['imageMessage', 'videoMessage', 'audioMessage', 'stickerMessage', 'documentMessage']

            if (mediaTypes.includes(msgType)) {
              const type = msgType.replace('Message', '')
              const buffer = await downloadMedia({ msg: media, mtype: type }).catch(() => null)
              if (buffer) {
                await conn.sendMessage(myJid, { [type]: buffer, caption, mimetype: media.mimetype })
              }
            }
          }
        } catch (err) {
          console.error('Anti-delete failed:', err.message)
        }
        return
      }

      // Prevent duplicate processing
      if (msgRetryMap.has(m.key.id)) return
      msgRetryMap.set(m.key.id, true)
      setTimeout(() => msgRetryMap.delete(m.key.id), 5000)

      // 3. Anti-ViewOnce (improved unwrap)
      if (global.antiViewOnce && !m.key.fromMe) {
        try {
          const unwrapped = unwrapViewOnce(m.message)
          if (unwrapped) {
            const content = unwrapped.imageMessage || unwrapped.videoMessage
            if (content) {
              const isImage = !!unwrapped.imageMessage
              const mtype = isImage ? 'imageMessage' : 'videoMessage'
              const buffer = await downloadMedia({ msg: content, mtype }).catch(() => null)
              if (buffer) {
                await conn.sendMessage(myJid, {
                  [isImage ? 'image' : 'video']: buffer,
                  caption: '🕵️‍♂️ ViewOnce Captured',
                })
              }
            }
          }
        } catch (err) {
          console.error('Anti-viewonce failed:', err.message)
        }
      }

      // Unwrap ephemeral if present
      m.message = m.message.ephemeralMessage?.message || m.message

      // Convert to simple message
      const msg = smsg(conn, m)
      if (!msg.body) return

      // 4. Command Handler
      const prefix = global.prefa?.find((p) => msg.body.startsWith(p)) || ''
      const isCmd = prefix && msg.body.startsWith(prefix)
      const command = isCmd ? msg.body.slice(prefix.length).trim().split(' ').shift().toLowerCase() : ''
      const args = msg.body.trim().split(/ +/).slice(1)
      const text = args.join(' ')

      if (isCmd && plugins.has(command)) {
        try {
          await plugins.get(command).run(conn, msg, args, text)
        } catch (err) {
          console.error(`Command ${command} error:`, err.message)
          await msg.reply('❌ Command failed. Check logs.').catch(() => {})
        }
      }
    })
  } catch (err) {
    console.error('Fatal startup error:', err)
    setTimeout(startMantra, 10000) // Retry startup
  }
}

// Global error handlers
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err.stack || err)
})

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason)
})

startMantra()
