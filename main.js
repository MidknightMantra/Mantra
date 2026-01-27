import './config.js'
import path from 'path'
import { fileURLToPath } from 'url'
import pino from 'pino'
import fs from 'fs/promises'
import { smsg } from './lib/simple.js'
import { downloadMedia } from './lib/media.js'

// ESM imports for Baileys (v7-rc compatible)
import makeWASocket, { 
  useMultiFileAuthState, 
  DisconnectReason, 
  fetchLatestBaileysVersion 
} from '@whiskeysockets/baileys'

// Fallback for makeInMemoryStore (since it may not be exported in main in v7-rc)
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
let makeInMemoryStore = null
try {
  // Try direct from main (some forks/examples do this)
  const baileys = require('@whiskeysockets/baileys')
  makeInMemoryStore = baileys.makeInMemoryStore || baileys.default?.makeInMemoryStore
} catch {}
if (!makeInMemoryStore) {
  try {
    // Correct subpath from Baileys source (lib/Store/make-in-memory-store)
    const StoreModule = require('@whiskeysockets/baileys/lib/Store/make-in-memory-store')
    makeInMemoryStore = StoreModule.makeInMemoryStore || StoreModule.default
  } catch (e) {
    console.warn('⚠️ Failed to load makeInMemoryStore even from subpath. Anti-delete will be limited. Consider adding @naanzitos/baileys-make-in-memory-store if needed.')
  }
}

// ESM paths
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Store setup
const store = makeInMemoryStore
  ? makeInMemoryStore({ logger: pino({ level: 'silent' }).child({ name: 'store' }) })
  : null

const msgRetryMap = new Map()

if (store) {
  console.log('🛡️ Anti-Delete & Message Store: ACTIVE')
} else {
  console.log('⚠️ Message Store: DISABLED (anti-delete limited)')
}

// Unwrap ViewOnce helper (recursive)
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
    let version = [2, 3000, 0] // fallback
    try {
      ({ version } = await fetchLatestBaileysVersion())
    } catch (e) {
      console.warn('Version fetch failed, using fallback:', e.message)
    }

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
      shouldReconnect: () => true,
    })

    if (store) store.bind(conn.ev)

    let myJid = null
    conn.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect } = update
      if (connection === 'open') {
        // Use conn.user.jid directly (normalized full JID)
        myJid = conn.user?.jid
        console.log('✅ Mantra Connected! Bot JID:', myJid)
        console.log(`👀 Auto-Status Read: ${global.autoStatusRead ? 'ON' : 'OFF'}`)
        console.log(`💾 Auto-Status Save: ${global.autoStatusSave ? 'ON' : 'OFF'}`)
        console.log(`🗑️ Anti-Delete: ${global.antiDelete ? 'ON' : 'OFF'}`)
        console.log(`🕵️ Anti-ViewOnce: ${global.antiViewOnce ? 'ON' : 'OFF'}`)

        if (global.alwaysOnline) {
          setInterval(() => conn.sendPresenceUpdate('available'), 10000)
        }
      } else if (connection === 'close') {
        const status = lastDisconnect?.error?.output?.statusCode
        console.log(`Connection closed (code: ${status || 'unknown'})`)
        if (status !== DisconnectReason.loggedOut) {
          console.log('🔄 Reconnecting in 5 seconds...')
          setTimeout(startMantra, 5000)
        } else {
          console.log('❌ Logged out. Delete session and rescan.')
        }
      }
    })

    conn.ev.on('creds.update', saveCreds)

    // Plugin loader - REMOVED cache-bust query param to fix "Invalid URL"
    // In production, hot-reloading isn't needed; restart container for changes
    const pluginFolder = path.join(__dirname, 'plugins')
    const plugins = new Map()

    const loadPlugins = async () => {
      plugins.clear()
      try {
        const files = await fs.readdir(pluginFolder)
        for (const file of files) {
          if (!file.endsWith('.js')) continue
          const pluginPath = path.join(pluginFolder, file)
          try {
            // Plain file:// without ?t= - fixes Invalid URL in some envs (e.g. Railway)
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
      } catch (e) {
        console.error('Plugin folder error:', e.message)
      }
    }

    await loadPlugins()

    // Message handler (anti-delete fixed to type 5, use myJid)
    conn.ev.on('messages.upsert', async (chatUpdate) => {
      if (chatUpdate.type === 'append') return
      const m = chatUpdate.messages[0]
      if (!m?.message) return

      const msgTime = m.messageTimestamp?.low ?? m.messageTimestamp ?? 0
      if (Date.now() / 1000 - msgTime > 30) return

      if (!myJid) return // wait for connection

      // 1. Status
      if (m.key.remoteJid === 'status@broadcast') {
        if (global.autoStatusRead) await conn.readMessages([m.key]).catch(() => {})
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

      // 2. Anti-Delete (use type 5 for revoke/delete-for-everyone)
      if (global.antiDelete && m.message.protocolMessage?.type === 5 && store) {
        const key = m.message.protocolMessage.key
        if (!key?.remoteJid || !key?.id) return
        try {
          const deletedMsg = await store.loadMessage(key.remoteJid, key.id)
          if (!deletedMsg?.message) return
          const participant = deletedMsg.key?.participant || deletedMsg.participant || m.key.participant || 'unknown'
          const caption = `🗑️ *Deleted Message*\nFrom: @${participant.split('@')[0]}`
          // Text handling...
          if (deletedMsg.message.conversation || deletedMsg.message.extendedTextMessage?.text) {
            const text = deletedMsg.message.conversation || deletedMsg.message.extendedTextMessage.text
            await conn.sendMessage(myJid, { text: `\( {caption}\n\n \){text}`, mentions: [participant] })
          } else {
            const msgType = Object.keys(deletedMsg.message)[0]
            const media = deletedMsg.message[msgType]
            const supported = ['imageMessage', 'videoMessage', 'audioMessage', 'stickerMessage', 'documentMessage']
            if (supported.includes(msgType)) {
              const type = msgType.replace('Message', '')
              const buffer = await downloadMedia({ msg: media, mtype: type }).catch(() => null)
              if (buffer) await conn.sendMessage(myJid, { [type]: buffer, caption, mimetype: media.mimetype })
            }
          }
        } catch (err) {
          console.error('Anti-delete failed:', err.message)
        }
        return
      }

      if (msgRetryMap.has(m.key.id)) return
      msgRetryMap.set(m.key.id, true)
      setTimeout(() => msgRetryMap.delete(m.key.id), 5000)

      // 3. Anti-ViewOnce
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
                  caption: '🕵️ ViewOnce Captured',
                })
              }
            }
          }
        } catch (err) {
          console.error('Anti-ViewOnce failed:', err.message)
        }
      }

      m.message = m.message.ephemeralMessage?.message || m.message
      const msg = smsg(conn, m)
      if (!msg.body) return

      const prefix = global.prefa?.find(p => msg.body.startsWith(p)) || ''
      const isCmd = !!prefix && msg.body.startsWith(prefix)
      const command = isCmd ? msg.body.slice(prefix.length).trim().split(' ')[0].toLowerCase() : ''
      const args = msg.body.trim().split(/ +/).slice(1)
      const text = args.join(' ')

      if (isCmd && plugins.has(command)) {
        try {
          await plugins.get(command).run(conn, msg, args, text)
        } catch (err) {
          console.error(`Command ${command} error:`, err.message)
          await msg.reply('❌ Command failed.').catch(() => {})
        }
      }
    })
  } catch (err) {
    console.error('Startup error:', err.message)
    setTimeout(startMantra, 10000)
  }
}

process.on('uncaughtException', err => console.error('Uncaught:', err.stack || err))
process.on('unhandledRejection', reason => console.error('Unhandled Rejection:', reason))

startMantra()
