import './config.js'
import path from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'
import pino from 'pino'
import fs from 'fs/promises'
import { smsg } from './lib/simple.js'
import { downloadMedia } from './lib/media.js'

const require = createRequire(import.meta.url)
const baileys = require('@whiskeysockets/baileys')

const makeWASocket = baileys.default || baileys
const { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = baileys

// 🎯 SPECIFIC FIX FOR v7.0.0-rc.9
// This version often exports everything through the default object or a dedicated store file
let makeInMemoryStore = baileys.makeInMemoryStore || (baileys.default && baileys.default.makeInMemoryStore)

if (typeof makeInMemoryStore !== 'function') {
    try {
        // Direct file access for rc.9 architecture
        makeInMemoryStore = require('@whiskeysockets/baileys/lib/Store/index').makeInMemoryStore
    } catch {
        try {
            // Alternative path for some builds
            makeInMemoryStore = require('@whiskeysockets/baileys/lib/Utils/make-in-memory-store').makeInMemoryStore
        } catch (e) {
            makeInMemoryStore = null
        }
    }
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const store = typeof makeInMemoryStore === 'function' 
  ? makeInMemoryStore({ logger: pino({ level: 'silent' }).child({ name: 'store' }) }) 
  : null

if (store) {
  console.log('🛡️ Anti-Delete & Message Store: ACTIVE')
} else {
  console.log('⚠️ Warning: Message Store failed to initialize. Anti-delete will be limited.')
}

const msgRetryMap = new Map()
let pluginsLoaded = false 

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
    let version = [2, 3000, 1015901307]
    try {
        const v = await fetchLatestBaileysVersion()
        version = v.version
    } catch {}

    const conn = makeWASocket({
      logger: pino({ level: 'silent' }),
      auth: state,
      version,
      connectTimeoutMs: 60000,
      keepAliveIntervalMs: 15000,
      emitOwnEvents: true,
      fireInitQueries: true,
      syncFullHistory: true,
      markOnlineOnConnect: true,
      browser: ['Mantra', 'Chrome', '1.0.0'],
    })

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
        }, 2000)
      } else if (connection === 'close') {
        const status = lastDisconnect?.error?.output?.statusCode
        if (status !== DisconnectReason.loggedOut) {
          setTimeout(startMantra, status === 408 ? 10000 : 5000)
        }
      }
    })

    conn.ev.on('creds.update', saveCreds)

    const loadPlugins = async () => {
      if (pluginsLoaded) return
      const pluginFolder = path.join(__dirname, 'plugins')
      try {
        const files = await fs.readdir(pluginFolder)
        for (const file of files) {
          if (!file.endsWith('.js')) continue
          const plugin = await import(`file://${path.join(pluginFolder, file)}`)
          if (plugin.default?.cmd) console.log(`Loaded plugin: ${plugin.default.cmd}`)
        }
        pluginsLoaded = true
      } catch {}
    }
    await loadPlugins()

    conn.ev.on('messages.upsert', async (chatUpdate) => {
      if (chatUpdate.type === 'append') return
      const m = chatUpdate.messages[0]
      if (!m?.message || !myJid) return

      // Anti-Delete logic needs the store
      if (global.antiDelete && m.message.protocolMessage?.type === 5 && store) {
        const key = m.message.protocolMessage.key
        try {
          const deletedMsg = await store.loadMessage(key.remoteJid, key.id)
          if (!deletedMsg?.message) return
          const participant = deletedMsg.key?.participant || key.remoteJid
          const caption = `🗑️ *Deleted Message*\nFrom: @${participant.split('@')[0]}`
          
          if (deletedMsg.message.conversation || deletedMsg.message.extendedTextMessage) {
            const text = deletedMsg.message.conversation || deletedMsg.message.extendedTextMessage.text
            await conn.sendMessage(myJid, { text: `${caption}\n\n${text}`, mentions: [participant] })
          } else {
            const type = Object.keys(deletedMsg.message)[0]
            const buffer = await downloadMedia({ msg: deletedMsg.message[type], mtype: type.replace('Message', '') }).catch(() => null)
            if (buffer) await conn.sendMessage(myJid, { [type.replace('Message', '')]: buffer, caption, mentions: [participant] })
          }
        } catch {}
      }

      // Standard smsg processing for plugins
      const msg = smsg(conn, m)
      if (!msg.body) return
      // ... (Rest of your command handling logic)
    })
  } catch (err) {
    setTimeout(startMantra, 15000)
  }
}

startMantra()
