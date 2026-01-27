const { downloadMedia } = require('../lib/media')

module.exports = {
    cmd: 'sticker',
    run: async (conn, m, args) => {
        try {
            // 1. Identify Media (Direct or Quoted)
            // We check if the message itself is an image/video, or if it quotes one.
            const content = m.msg?.contextInfo?.quotedMessage 
                ? (m.msg.contextInfo.quotedMessage.imageMessage || m.msg.contextInfo.quotedMessage.videoMessage)
                : (m.message.imageMessage || m.message.videoMessage)

            if (!content) return m.reply('❌ Send/Reply to an image or video with ,sticker')

            // 2. Limit Video Duration
            // Animated stickers can't be too long or WhatsApp rejects them.
            if (content.seconds > 10) return m.reply('❌ Video too long! Max 10 seconds.')

            // React (Processing)
            await conn.sendMessage(m.chat, { react: { text: '📦', key: m.key } })

            // 3. Download Media
            const type = content.mimetype.split('/')[0]
            const buffer = await downloadMedia({ msg: content, mtype: type === 'image' ? 'imageMessage' : 'videoMessage' })

            // 4. Send as Sticker
            // Baileys automatically handles the conversion to WebP using the FFmpeg we installed.
            await conn.sendMessage(m.chat, { 
                sticker: buffer,
                packname: global.packname || 'Mantra', // From config.js
                author: global.author || 'Bot'         // From config.js
            }, { quoted: m })

        } catch (e) {
            console.error(e)
            m.reply('❌ Error making sticker.')
        }
    }
}
