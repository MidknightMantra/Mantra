const { downloadMedia } = require('../lib/media')
const { writeExif } = require('../lib/exif')
const fs = require('fs')

module.exports = {
    cmd: 'sticker',
    run: async (conn, m, args) => {
        try {
            // 1. Identify Media
            const content = m.msg?.contextInfo?.quotedMessage 
                ? (m.msg.contextInfo.quotedMessage.imageMessage || m.msg.contextInfo.quotedMessage.videoMessage)
                : (m.message.imageMessage || m.message.videoMessage)

            if (!content) return m.reply('❌ Send/Reply to an image or video!')

            // 2. Download
            const type = content.mimetype.split('/')[0]
            const buffer = await downloadMedia({ msg: content, mtype: type === 'image' ? 'imageMessage' : 'videoMessage' })

            // React
            await conn.sendMessage(m.chat, { react: { text: '📦', key: m.key } })

            // 3. Create Sticker with Metadata (The Fix)
            // We pass the raw buffer and the config names
            const stickerPath = await writeExif(
                { mimetype: content.mimetype, data: buffer }, 
                { packname: global.packname, author: global.author }
            )

            // 4. Send
            await conn.sendMessage(m.chat, { sticker: { url: stickerPath } }, { quoted: m })

            // Clean up file
            fs.unlinkSync(stickerPath)

        } catch (e) {
            console.error(e)
            m.reply('❌ Error making sticker.')
        }
    }
}
