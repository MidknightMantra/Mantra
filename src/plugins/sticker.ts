import { Plugin } from '../types/index.js'
import { downloadMediaMessage } from '@whiskeysockets/baileys'
import { logger } from '../utils/logger.js'
import { config } from '../config/env.js'
import { Sticker, StickerTypes } from 'wa-sticker-formatter'

const sticker: Plugin = {
    name: 'sticker',
    triggers: ['sticker', 's', 'wm'],
    category: 'media',
    description: 'Convert image/video to sticker',
    execute: async ({ msg, reply, react, conn }) => {
        const isQuoted = !!msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
        const messageType = Object.keys(msg.message || {})[0]
        const isImage = messageType === 'imageMessage'
        const isVideo = messageType === 'videoMessage'

        // Check for quoted media type
        const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
        const isQuotedImage = quotedMsg?.imageMessage
        const isQuotedVideo = quotedMsg?.videoMessage

        if (!isImage && !isVideo && !isQuotedImage && !isQuotedVideo) {
            await reply('📸 Please send or reply to an image/video!')
            return
        }

        await react('🎨')

        try {
            let buffer: Buffer

            if (isQuoted) {
                const quoted = msg.message!.extendedTextMessage!.contextInfo!
                const qM = quoted.quotedMessage!

                // Reconstruct message for downloader
                const fakeM = {
                    key: {
                        remoteJid: msg.key.remoteJid,
                        id: quoted.stanzaId,
                        participant: quoted.participant
                    },
                    message: qM
                }
                buffer = await downloadMediaMessage(
                    fakeM as any,
                    'buffer',
                    {}
                ) as Buffer
            } else {
                buffer = await downloadMediaMessage(
                    msg,
                    'buffer',
                    {}
                ) as Buffer
            }

            const s = new Sticker(buffer, {
                pack: config.PACK_NAME || 'Mantra Bot',
                author: config.AUTHOR_NAME || '@Mantra',
                type: StickerTypes.FULL,
                categories: ['🤩', '🎉'] as any,
                quality: 70
            })

            const stickerBuffer = await s.toBuffer()
            await conn.sendMessage(msg.key.remoteJid!, { sticker: stickerBuffer }, { quoted: msg })
            await react('✅')

        } catch (err) {
            logger.error({ err }, 'Sticker conversion failed')
            await reply('❌ Failed to convert media. Ensure it is an image or a short video (< 10s).')
        }
    }
}

export default sticker
