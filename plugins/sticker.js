import { downloadMedia } from '../lib/media.js'
import { writeExif } from '../lib/exif.js'
import fs from 'fs'

export default {
    cmd: 'sticker',
    run: async (conn, m, args) => {
        try {
            // 1. Check what the user replied to
            const content = m.msg?.contextInfo?.quotedMessage 
                ? (m.msg.contextInfo.quotedMessage.imageMessage || m.msg.contextInfo.quotedMessage.videoMessage) 
                : (m.message.imageMessage || m.message.videoMessage)

            if (!content) return m.reply('❌ Send or reply to an image/video!')

            // 2. React
            await conn.sendMessage(m.chat, { react: { text: '📦', key: m.key } })

            // 3. Download & Convert
            const mtype = content.mimetype.split('/')[0] === 'image' ? 'imageMessage' : 'videoMessage'
            const buffer = await downloadMedia({ msg: content, mtype: mtype })
            
            // 4. Add Metadata (Packname/Author)
            const stickerPath = await writeExif(
                { mimetype: content.mimetype, data: buffer }, 
                { packname: global.packname, author: global.author }
            )
            
            // 5. Send Sticker
            await conn.sendMessage(m.chat, { sticker: { url: stickerPath } }, { quoted: m })
            
            // 6. Cleanup
            fs.unlinkSync(stickerPath)
            await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

        } catch (e) {
            console.error(e)
            m.reply('❌ Conversion failed.')
        }
    }
}
