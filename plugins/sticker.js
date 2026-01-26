const { downloadMedia } = require('../lib/media')
const fs = require('fs')
const path = require('path')
const { exec } = require('child_process')

module.exports = {
    cmd: 'sticker',
    run: async (conn, m, args) => {
        try {
            // Check if message is an image or video
            const isMedia = (m.mtype === 'imageMessage' || m.mtype === 'videoMessage')
            const isQuoted = m.msg?.contextInfo?.quotedMessage
            
            if (!isMedia && !isQuoted) return m.reply('❌ Send/Reply to an image or video!')

            await m.reply('⏳ Processing...')

            // Handle Quoted Media or Direct Media
            let msgToDownload = isQuoted ? {
                msg: m.msg.contextInfo.quotedMessage.imageMessage || m.msg.contextInfo.quotedMessage.videoMessage,
                mtype: m.msg.contextInfo.quotedMessage.imageMessage ? 'imageMessage' : 'videoMessage',
                conn: conn // Pass connection
            } : m

            // Download as Buffer
            let buffer = await downloadMedia(msgToDownload)
            
            // Temporary File Paths
            let ran = Date.now()
            let inputFile = path.join(__dirname, `../temp/${ran}.${isQuoted ? 'mp4' : 'jpg'}`)
            let outputFile = path.join(__dirname, `../temp/${ran}.webp`)

            // Create temp folder if not exists
            if (!fs.existsSync('./temp')) fs.mkdirSync('./temp')
            
            fs.writeFileSync(inputFile, buffer)

            // Convert using FFmpeg (The Dangerous Efficiency)
            // We scale it to 512x512 to fit WhatsApp Sticker specs
            exec(`ffmpeg -i ${inputFile} -vcodec libwebp -filter:v fps=fps=20 -lossless 1 -loop 0 -preset default -an -vsync 0 -s 512:512 ${outputFile}`, async (err) => {
                if (err) {
                    console.error(err)
                    return m.reply('❌ Conversion Failed')
                }

                // Send the Sticker
                await conn.sendMessage(m.chat, { 
                    sticker: { url: outputFile } 
                }, { quoted: m })

                // Clean up temp files
                fs.unlinkSync(inputFile)
                fs.unlinkSync(outputFile)
            })

        } catch (e) {
            console.error(e)
            m.reply('❌ Error creating sticker.')
        }
    }
}
