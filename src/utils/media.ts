import { WAMessage, downloadMediaMessage } from '@whiskeysockets/baileys'
import { logger } from './logger.js'

export async function downloadMedia(m: WAMessage): Promise<Buffer | null> {
    try {
        const type = Object.keys(m.message!)[0]
        if (!['imageMessage', 'videoMessage', 'stickerMessage'].includes(type) &&
            !['imageMessage', 'videoMessage'].includes(Object.keys(m.message?.extendedTextMessage?.contextInfo?.quotedMessage || {})[0])) {
            return null
        }

        // If quoted
        if (m.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
            // Reconstruct a fake message object for downloadMediaMessage
            // This is a bit tricky in Baileys, but often we just want the buffer
            // A cleaner way is using the built-in simpler download if available or a library helper
            // For strict manual download:
            // We would need to implement the full download logic or use the helper with the quoted key
            // But 'downloadMediaMessage' expects a full message object.
            // Let's defer strict implementation or use a community helper if available. 
            // For now, let's implement the direct message download.
            return null // Todo: Quoted download
        }

        const buffer = await downloadMediaMessage(
            m,
            'buffer',
            { logger: logger as any, reuploadRequest: (u) => new Promise(resolve => resolve(u)) }
        )
        return buffer as Buffer
    } catch (err) {
        logger.error(err, 'Failed to download media')
        return null
    }
}
