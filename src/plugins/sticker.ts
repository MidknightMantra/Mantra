import { Plugin } from '../types/index.js'
import { downloadMediaMessage } from '@whiskeysockets/baileys'
import { logger } from '../utils/logger.js'
import { Sticker, StickerTypes } from 'wa-sticker-formatter'

const sticker: Plugin = {
    name: 'sticker',
    triggers: ['sticker', 's', 'wm'],
    category: 'media',
    description: 'Convert image/video to sticker',
    execute: async ({ msg, reply, react, conn }) => {
        // Check if message is image/video or quoted image/video
        const isQuoted = !!msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
        const messageType = Object.keys(msg.message!)[0]
        const isImage = messageType === 'imageMessage'
        const isVideo = messageType === 'videoMessage'

        if (!isImage && !isVideo && !isQuoted) {
            await reply('📸 Please send or reply to an image/video!')
            return
        }

        await react('🎨')

        try {
            // Download logic
            // Note: In real production code, we'd handle quoted messages robustly.
            // Here we assume the user sends the image directly for simplicity in this demo,
            // or we need to reconstruct the message for the downloader if quoted.
            let buffer: Buffer

            if (isQuoted) {
                // This is complex in Baileys without the store finding the original message object
                // We will just tell the user to send direct for now to keep refactor safe
                // Or we can try: 
                const quoted = msg.message!.extendedTextMessage!.contextInfo!
                const qM = quoted.quotedMessage!
                // Construct a minimal message for download
                const fakeM = {
                    key: { remoteJid: msg.key.remoteJid, id: quoted.stanzaId },
                    message: qM
                }
                buffer = await downloadMediaMessage(
                    fakeM as any,
                    'buffer',
                    { logger: logger as any }
                ) as Buffer
            } else {
                buffer = await downloadMediaMessage(
                    msg,
                    'buffer',
                    { logger: logger as any }
                ) as Buffer
            }

            const s = new Sticker(buffer, {
                pack: 'Mantra Bot',
                author: '@Mantra',
                type: StickerTypes.FULL,
                categories: ['🤩', '🎉'],
                quality: 50
            })

            const stickerBuffer = await s.toBuffer()
            await conn.sendMessage(msg.key.remoteJid!, { sticker: stickerBuffer }, { quoted: msg })

        } catch (err) {
            logger.error({ err }, 'Sticker conversion failed')
            await reply('❌ Failed to convert media. Ensure it is not too large.')
        }
    }
}

export default sticker
