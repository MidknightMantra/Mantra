import {
    makeWASocket,
    DisconnectReason,
    useMultiFileAuthState,
    WASocket,
    makeCacheableSignalKeyStore,
    fetchLatestBaileysVersion,
    proto,
    MessageUpsertType,
    ConnectionState
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import { AuthService } from './AuthService.js'
import { PluginManager } from './PluginManager.js'
import { config } from '../config/env.js'
import { logger } from '../utils/logger.js'
import { getBody } from '../utils/messages.js'

export class SocketService {
    public sock: WASocket | undefined
    private authService: AuthService
    private pluginManager: PluginManager
    private isReconnecting = false

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
            logger: logger as any,
            printQRInTerminal: true,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, logger as any),
            },
            browser: ['Mantra Refactored', 'Chrome', '1.0.0'],
            generateHighQualityLinkPreview: true,
        })

        this.sock?.ev.on('creds.update', saveCreds)

        this.sock?.ev.on('connection.update', (update: Partial<ConnectionState>) => {
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
            }
        })

        this.sock?.ev.on('messages.upsert', async ({ messages, type }: { messages: proto.IWebMessageInfo[]; type: MessageUpsertType }) => {
            if (type !== 'notify') return

            for (const m of messages) {
                if (!m.message) continue

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
