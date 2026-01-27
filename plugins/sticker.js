import { downloadMedia } from '../lib/media.js'
import { writeExif } from '../lib/exif.js'
import fs from 'fs'

export default {
    cmd: 'sticker',
    run: async (conn, m, args) => {
        try {
            // 1. Robust Message Extraction
            // We define 'q' as the target message (either the quoted one or the current one)
            let q = m.quoted ? m.quoted : m
            let mime = (q.msg || q).mimetype || ''

            // Check if it is valid media
            if (!mime) return m.reply('❌ No media found. Please reply to an image or video.')
            
            // Check if it is specifically an image or video
            if (!/image|video/.test(mime)) return m.reply('❌ Please reply to an image or video only.')

            // 2. React to indicate processing
            await conn.sendMessage(m.chat, { react: { text: '📦', key: m.key } })

            // 3. Download
            // We pass the actual media object to the downloader
            const img = await q.download?.() || await downloadMedia(q.msg || q)
            
            if (!img) throw new Error('Failed to download media buffer.')

            // 4. Convert & Add Metadata
            // Ensure global.packname and global.author exist, otherwise fallback to defaults
            const packInfo = {
                packname: global.packname || 'Sticker Bot',
                author: global.author || '@MyBot'
            }

            // Write Exif (Converts Buffer -> WebP Sticker with Metadata)
            const stickerPath = await writeExif(
                { mimetype: mime, data: img }, 
                packInfo
            )

            if (!stickerPath) throw new Error('Exif/Conversion returned null.')

            // 5. Send the Sticker
            await conn.sendMessage(m.chat, { sticker: { url: stickerPath } }, { quoted: m })

            // 6. Cleanup
            // Check if file exists before unlinking to prevent crash
            if (fs.existsSync(stickerPath)) {
                fs.unlinkSync(stickerPath)
            }
            
            await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

        } catch (e) {
            // Log the actual error to your console so you can see WHY it failed
            console.error('Sticker Error:', e)
            m.reply('❌ Conversion failed.')
        }
    }
}
