const { downloadContentFromMessage } = require('@whiskeysockets/baileys')
const fs = require('fs')

// Function to save a stream to a file
const downloadMedia = async (message, filename) => {
    try {
        // Ensure we have the actual message content (msg) and the type (mtype)
        let msg = message.msg || message
        let mime = msg.mimetype || ''
        let messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0]

        // Fix for common type mismatch
        if (messageType === 'viewOnce') {
            msg = msg.message.imageMessage || msg.message.videoMessage
            messageType = msg.mimetype.split('/')[0]
        }

        const stream = await downloadContentFromMessage(msg, messageType)
        let buffer = Buffer.from([])
        
        for await(const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk])
        }
        
        if (filename) {
            await fs.promises.writeFile(filename, buffer)
            return filename
        }
        
        return buffer
    } catch (err) {
        console.error('Download Failed:', err)
        throw err
    }
}

module.exports = { downloadMedia }
