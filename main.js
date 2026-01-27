import './config.js'
import path from 'path'
import { fileURLToPath } from 'url'
import pino from 'pino'
import fs from 'fs/promises'
import { smsg } from './lib/simple.js'
import { downloadMedia } from './lib/media.js'

// ESM imports for Baileys v7-rc
import makeWASocket, { 
  useMultiFileAuthState, 
  DisconnectReason, 
  fetchLatestBaileysVersion 
} from '@whiskeysockets/baileys'

// Store fallback - improved multi-attempt loading
let makeInMemoryStore = null
try {
  // Attempt 1: Direct from main export (common in recent versions)
  makeInMemoryStore = require('@whiskeysockets/baileys').makeInMemoryStore
} catch {}
if (!makeInMemoryStore) {
  try {
    // Attempt 2: From lib/Utils/store (older structure)
    makeInMemoryStore = require('@whiskeysockets/baileys/lib/Utils/store').makeInMemoryStore
  } catch {}
}
if (!makeInMemoryStore) {
  try {
    // Attempt 3: Explicit file path (most reliable for source structure)
    makeInMemoryStore = require('@whiskeysockets/baileys/lib/Store/make-in-memory-store').makeInMemoryStore
  } catch (e) {
    console.warn('⚠️ All attempts to load makeInMemoryStore failed. Anti-delete limited. Consider manual store implementation or Baileys fork.')
  }
}

// ESM paths
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Store & globals
const store = makeInMemoryStore
  ? makeInMemoryStore({ logger: pino({ level: 'silent' }).child({ name: 'store' }) })
  : null

const msgRetryMap = new Map()
let pluginsLoaded = false // Flag to load plugins only once

if (store) {
  console.log('🛡️ Anti-Delete & Message Store: ACTIVE')
} else {
  console.log('⚠️ Message Store: DISABLED (anti-delete limited)')
}

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
    let version = [2, 2413, 1] // Updated safe fallback closer to current WhatsApp
    try {
      ({ version } = await fetchLatestBaileysVersion())
      console.log('Fetched latest version:', version)
    } catch (e) {
      console.warn('Version fetch failed, using fallback:', e.message)
    }

    const conn = makeWASocket({
      logger: pino({ level: 'silent' }),
      auth: state,
      version,
      connectTimeoutMs: 120000, // Increased to 2min to handle Railway latency/408 timeouts
      defaultQueryTimeoutMs: 0,
      keepAliveIntervalMs: 30000, // More aggressive keep-alive
      emitOwnEvents: true,
      fireInitQueries: true,
      generateHighQualityLinkPreview: true,
      syncFullHistory: true,
      markOnlineOnConnect: true,
      browser: ['Mantra', 'Chrome', '1.0.0'],
      shouldReconnect: (lastError) => {
        const status = lastError?.output?.statusCode
        return status !== DisconnectReason.loggedOut && status !== 408 // Avoid loop on persistent 408
      },
    })

    if (store) store.bind(conn.ev)

    let myJid = null
    conn.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect } = update
      if (connection === 'open') {
        // Delay JID check to ensure conn.user is populated
        setTimeout(async () => {
          myJid = conn.user?.jid || conn.user?.id?.split(':')[0] + '@s.whatsapp.net'
          console.log('✅ Mantra Connected! Bot JID:', myJid || 'Still resolving - check creds.json')
          console.log(`👀 Auto-Status Read: ${global.autoStatusRead ? 'ON' : 'OFF'}`)
          console.log(`💾 Auto-Status Save: ${global.autoStatusSave ? 'ON' : 'OFF'}`)
          console.log(`🗑️ Anti-Delete: ${global.antiDelete ? 'ON' : 'OFF'}`)
          console.log(`🕵️ Anti-ViewOnce: ${global.antiViewOnce ? 'ON' : 'OFF'}`)

          if (global.alwaysOnline) {
            setInterval(() => conn.sendPresenceUpdate('available'), 10000)
          }
        }, 2000) // 2s delay for user object init
      } else if (connection === 'close') {
        const status = lastDisconnect?.error?.output?.statusCode
        console.log(`Connection closed (code: ${status || 'unknown'})`)
        if (status !== DisconnectReason.loggedOut && status !== 408) {
          console.log('🔄 Reconnecting in 5 seconds...')
          setTimeout(startMantra, 5000)
        } else if (status === 408) {
          console.log('Timeout (408) detected. Retrying in 10 seconds...')
          setTimeout(startMantra, 10000)
        } else {
          console.log('❌ Logged out or fatal. Stop and rescan.')
        }
      }
    })

    conn.ev.on('creds.update', saveCreds)

    // Load plugins only once
    const pluginFolder = path.join(__dirname, 'plugins')
    const plugins = new Map()

    const loadPlugins = async () => {
      if (pluginsLoaded) {
        console.log('Plugins already loaded - skipping on reconnect')
        return
      }
      plugins.clear()
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

    // Message handler
    conn.ev.on('messages.upsert', async (chatUpdate) => {
      if (chatUpdate.type === 'append') return
      const m = chatUpdate.messages[0]
      if (!m?.message) return

      const msgTime = m.messageTimestamp?.low ?? m.messageTimestamp ?? 0
      if (Date.now() / 1000 - msgTime > 30) return

      if (!myJid) {
        console.warn('myJid not set yet - skipping self-send operations')
        return
      }

      // Status handler
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

      // Anti-Delete (type 5)
      if (global.antiDelete && m.message.protocolMessage?.type === 5 && store) {
        const key = m.message.protocolMessage.key
        if (!key?.remoteJid || !key?.id) return
        try {
          const deletedMsg = await store.loadMessage(key.remoteJid, key.id)
          if (!deletedMsg?.message) return
          const participant = deletedMsg.key?.participant || deletedMsg.participant || m.key.participant || 'unknown'
          const caption = `🗑️ *Deleted Message*\nFrom: @${participant.split('@')[0]}`
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

      // Anti-ViewOnce
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
    setTimeout(startMantra, 15000) // Longer delay on fatal errors
  }
}

process.on('uncaughtException', err => console.error('Uncaught:', err.stack || err))
process.on('unhandledRejection', reason => console.error('Unhandled Rejection:', reason))

startMantra()
