const { getRandom } = require('./simple') // Ensure simple.js has a random generator or use standard math
const fs = require('fs')
const path = require('path')
const { exec } = require('child_process')

// Function to save a stream to a file
const downloadMedia = async (message, filename) => {
    // Check if message has media
    if (!message.msg) throw new Error('No Message Found')
    const mime = (message.msg || message).mimetype || ''
    const messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0]
    
    // We use the Baileys stream downloader
    const stream = await (global.conn || message.conn).downloadContentFromMessage(message.msg, messageType)
    let buffer = Buffer.from([])
    
    for await(const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk])
    }
    
    // Save to file if filename is provided
    if (filename) {
        await fs.promises.writeFile(filename, buffer)
        return filename
    }
    
    return buffer
}

module.exports = { downloadMedia }
