import { Plugin } from '../types/index.js'
import { downloadMediaMessage, WAMessage } from '@whiskeysockets/baileys'
import { logger } from '../utils/logger.js'

const viewonce: Plugin = {
    name: 'viewonce',
    triggers: ['vv', 'viewonce', 'retrieved'],
    category: 'media',
    description: 'Retrieve a view-once message',
    execute: async ({ msg, reply, react, conn }) => {
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
        if (!quoted) {
            await reply('📸 Please reply to a ViewOnce message with *.vv*')
            return
        }

        const isViewOnce = quoted.viewOnceMessage || quoted.viewOnceMessageV2 || quoted.viewOnceMessageV2Extension

        if (!isViewOnce) {
            await reply('❌ That is not a ViewOnce message.')
            return
        }

        await react('🔓')

        try {
            // Reconstruct the message object for the downloader
            const actualMessage = quoted.viewOnceMessage?.message ||
                quoted.viewOnceMessageV2?.message ||
                quoted.viewOnceMessageV2Extension?.message

            if (!actualMessage) {
                await reply('❌ Could not find the message content.')
                return
            }

            const fakeM = {
                key: {
                    remoteJid: msg.key.remoteJid,
                    id: msg.message?.extendedTextMessage?.contextInfo?.stanzaId
                },
                message: actualMessage
            }

            const buffer = await downloadMediaMessage(
                fakeM as any,
                'buffer',
                {}
            ) as Buffer

            const type = Object.keys(actualMessage)[0]

            if (type === 'imageMessage') {
                await conn.sendMessage(msg.key.remoteJid!, { image: buffer, caption: '🔓 ViewOnce Image Recovered' }, { quoted: msg })
            } else if (type === 'videoMessage') {
                await conn.sendMessage(msg.key.remoteJid!, { video: buffer, caption: '🔓 ViewOnce Video Recovered' }, { quoted: msg })
            } else {
                await reply('❌ Unsupported ViewOnce type.')
            }

            await react('✅')

        } catch (err) {
            logger.error({ err }, 'ViewOnce recovery failed')
            await reply('❌ Failed to recover media. It might have expired or been deleted.')
        }
    }
}

export default viewonce
