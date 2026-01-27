import { downloadMedia } from '../lib/media.js'
import { writeExif } from '../lib/exif.js'
import fs from 'fs'

export default {
    cmd: 'sticker',
    run: async (conn, m, args) => {
        try {
            const content = m.msg?.contextInfo?.quotedMessage ? (m.msg.contextInfo.quotedMessage.imageMessage || m.msg.contextInfo.quotedMessage.videoMessage) : (m.message.imageMessage || m.message.videoMessage)
            if (!content) return m.reply('❌ Send/Reply to image!')
            
            const buffer = await downloadMedia({ msg: content, mtype: content.mimetype.split('/')[0] === 'image' ? 'imageMessage' : 'videoMessage' })
            const stickerPath = await writeExif({ mimetype: content.mimetype, data: buffer }, { packname: global.packname, author: global.author })
            
            await conn.sendMessage(m.chat, { sticker: { url: stickerPath } }, { quoted: m })
            fs.unlinkSync(stickerPath)
        } catch (e) {
            console.error(e)
            m.reply('❌ Error.')
        }
    }
}
