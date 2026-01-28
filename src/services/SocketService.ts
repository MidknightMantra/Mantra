import {
    makeWASocket,
    DisconnectReason,
    useMultiFileAuthState,
    WASocket,
    makeCacheableSignalKeyStore,
    fetchLatestBaileysVersion,
    proto,
    MessageUpsertType,
    ConnectionState,
    downloadMediaMessage
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import { AuthService } from './AuthService.js'
import { PluginManager } from './PluginManager.js'
import { config } from '../config/env.js'
import { logger, baileysLogger } from '../utils/logger.js'
import { getBody } from '../utils/messages.js'

import path from 'path'
import fs from 'fs/promises'

export class SocketService {
    public sock: WASocket | undefined
    private authService: AuthService
    private pluginManager: PluginManager
    private isReconnecting = false
    private msgCache = new Map<string, proto.IWebMessageInfo>()
    private presenceInterval: NodeJS.Timeout | undefined

    constructor() {
        this.authService = new AuthService()
        this.pluginManager = new PluginManager()
    }

    async start() {
        await this.pluginManager.loadPlugins()
        const { state, saveCreds } = await this.authService.init()
        const { version } = await fetchLatestBaileysVersion()

        this.sock = makeWASocket({
            version,
            logger: baileysLogger as any,
            printQRInTerminal: true,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, baileysLogger as any),
            },
            browser: ['Mantra Refactored', 'Chrome', '1.0.0'],
            generateHighQualityLinkPreview: true,
        })

        this.sock?.ev.on('creds.update', saveCreds)

        this.sock?.ev.on('connection.update', async (update: Partial<ConnectionState>) => {
            const { connection, lastDisconnect } = update

            if (connection === 'close') {
                const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut
                logger.warn({ err: lastDisconnect?.error }, 'Connection closed')

                if (shouldReconnect) {
                    if (!this.isReconnecting) {
                        this.isReconnecting = true
                        logger.info('🔄 Reconnecting...')
                        setTimeout(() => {
                            this.isReconnecting = false
                            this.start()
                        }, 3000)
                    }
                } else {
                    logger.error('❌ Logged out. Delete session and restart.')
                    process.exit(1)
                }
            } else if (connection === 'open') {
                logger.info('✅ Connected to WhatsApp!')

                // Read and Print SESSION_ID
                try {
                    const sessionPath = path.resolve('session', 'creds.json')
                    const creds = await fs.readFile(sessionPath, 'utf-8')
                    const sessionID = Buffer.from(creds).toString('base64')
                    logger.info(`\n\n📢 YOUR SESSION ID:\nMantra~${sessionID}\n\n`)
                } catch (err) {
                    logger.warn('Could not read session file to generate ID')
                }

                // --- Always Online Logic ---
                if (config.ALWAYS_ONLINE) {
                    logger.info('👤 Always Online enabled')
                    await this.sock?.sendPresenceUpdate('available')

                    // Set up heartbeat to keep status online
                    if (this.presenceInterval) clearInterval(this.presenceInterval)
                    this.presenceInterval = setInterval(async () => {
                        try {
                            await this.sock?.sendPresenceUpdate('available')
                        } catch (err) {
                            logger.error({ err }, 'Failed to send presence heartbeat')
                        }
                    }, 30000) // Every 30 seconds
                }
            }
        })

        this.sock?.ev.on('connection.update', ({ connection }) => {
            if (connection === 'close') {
                if (this.presenceInterval) {
                    clearInterval(this.presenceInterval)
                    this.presenceInterval = undefined
                }
            }
        })

        this.sock?.ev.on('messages.update', async (updates) => {
            for (const { key, update } of updates) {
                const protocolMsg = update.message?.protocolMessage
                if (protocolMsg?.type === proto.Message.ProtocolMessage.Type.REVOKE) {
                    const msgId = protocolMsg.key?.id
                    if (!msgId) continue

                    const originalMsg = this.msgCache.get(msgId)
                    if (originalMsg && config.ANTI_DELETE) {
                        try {
                            const jid = this.sock?.user?.id.split(':')[0] + '@s.whatsapp.net'
                            const participant = originalMsg.key.participant || originalMsg.key.remoteJid || ''
                            const from = originalMsg.key.remoteJid || ''
                            const name = originalMsg.pushName || 'Unknown'

                            await this.sock?.sendMessage(jid, {
                                text: `🗑️ *Anti-Delete Detected*\n\n👤 *From:* ${name} (@${participant.split('@')[0]})\n📍 *Chat:* ${from.endsWith('@g.us') ? 'Group' : 'Private'}\n🕒 *Time:* ${new Date().toLocaleString()}`,
                                mentions: [participant]
                            })

                            // Forward original message content
                            if (originalMsg.message) {
                                await this.sock?.sendMessage(jid, { forward: originalMsg }, { quoted: originalMsg })
                            }

                            logger.info({ msgId }, '🗑️ Deleted message recovered and sent to self')
                        } catch (err) {
                            logger.error({ err }, 'Failed to recover deleted message')
                        }
                    }
                }
            }
        })

        this.sock?.ev.on('messages.upsert', async ({ messages, type }: { messages: proto.IWebMessageInfo[]; type: MessageUpsertType }) => {
            if (type !== 'notify') return

            for (const m of messages) {
                if (!m.message) continue

                // Add to cache
                if (m.key.id) {
                    this.msgCache.set(m.key.id, m)
                    // limit cache size to 1000 messages
                    if (this.msgCache.size > 1000) {
                        const firstKey = this.msgCache.keys().next().value
                        if (firstKey) this.msgCache.delete(firstKey)
                    }
                }

                // --- Anti-ViewOnce Logic ---
                const viewOnceMsg = m.message.viewOnceMessage || m.message.viewOnceMessageV2 || m.message.viewOnceMessageV2Extension
                if (viewOnceMsg && config.ANTI_VIEW_ONCE) {
                    try {
                        const actualMessage = viewOnceMsg.message
                        if (actualMessage) {
                            const buffer = await downloadMediaMessage(m, 'buffer', {}) as Buffer
                            const type = Object.keys(actualMessage)[0]
                            const jid = this.sock?.user?.id.split(':')[0] + '@s.whatsapp.net'

                            if (type === 'imageMessage') {
                                await this.sock?.sendMessage(jid, {
                                    image: buffer,
                                    caption: `📸 *Mantra ViewOnce Recovery*\n\n👤 *From:* @${m.key.participant?.split('@')[0] || m.key.remoteJid?.split('@')[0]}\n🕒 *Received:* ${new Date().toLocaleString()}`,
                                    mentions: [m.key.participant || m.key.remoteJid || '']
                                })
                            } else if (type === 'videoMessage') {
                                await this.sock?.sendMessage(jid, {
                                    video: buffer,
                                    caption: `🎥 *Mantra ViewOnce Recovery*\n\n👤 *From:* @${m.key.participant?.split('@')[0] || m.key.remoteJid?.split('@')[0]}\n🕒 *Received:* ${new Date().toLocaleString()}`,
                                    mentions: [m.key.participant || m.key.remoteJid || '']
                                })
                            }
                            logger.info('👁️ ViewOnce message recovered and sent to self')
                        }
                    } catch (err) {
                        logger.error({ err }, 'Failed to recover ViewOnce')
                    }
                }
                // ---------------------------

                // Ignore status updates if configured
                if (m.key.remoteJid === 'status@broadcast' && !config.AUTO_READ_STATUS) continue

                const body = getBody(m)
                // Check prefix
                const prefix = config.PREFIX.find((p: string) => body.startsWith(p))

                if (prefix) {
                    const content = body.slice(prefix.length).trim()
                    const args = content.split(/ +/)
                    const command = args.shift()?.toLowerCase()

                    if (!command) continue

                    const plugin = this.pluginManager.getPlugin(command)

                    if (plugin) {
                        try {
                            const sender = m.key.participant || m.key.remoteJid || ''
                            // Construct Context
                            await plugin.execute({
                                conn: this.sock!,
                                msg: m,
                                from: m.key.remoteJid!,
                                sender,
                                body,
                                args,
                                command,
                                isOwner: config.OWNER_NUMBER.includes(sender.split('@')[0]),
                                isGroup: m.key.remoteJid?.endsWith('@g.us') || false,
                                reply: async (text) => {
                                    if (typeof text === 'string') {
                                        return await this.sock!.sendMessage(m.key.remoteJid!, { text }, { quoted: m })
                                    } else {
                                        return await this.sock!.sendMessage(m.key.remoteJid!, text, { quoted: m })
                                    }
                                },
                                react: async (emoji) => {
                                    await this.sock!.sendMessage(m.key.remoteJid!, { react: { text: emoji, key: m.key } })
                                }
                            })
                        } catch (err) {
                            logger.error({ err, command }, 'Error executing plugin')
                            await this.sock!.sendMessage(m.key.remoteJid!, { text: `❌ Error running ${command}` }, { quoted: m })
                        }
                    }
                }
            }
        })
    }
}
