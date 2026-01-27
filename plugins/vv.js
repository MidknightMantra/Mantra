const { downloadMedia } = require('../lib/media')

module.exports = {
    cmd: 'vv',
    run: async (conn, m, args) => {
        try {
            const quoted = m.msg?.contextInfo?.quotedMessage
            if (!quoted) return m.reply('❌ Reply to a ViewOnce!')

            // 1. Hunt for the ViewOnce Message
            // It might be 'viewOnceMessageV2', 'viewOnceMessage', or nested inside 'message'
            let viewOnce = quoted.viewOnceMessageV2 || quoted.viewOnceMessage || quoted

            // 2. Extract the actual Image/Video content
            // Sometimes it's viewOnce.message.imageMessage, sometimes just viewOnce.imageMessage
            let content = viewOnce.message?.imageMessage || viewOnce.message?.videoMessage || viewOnce.imageMessage || viewOnce.videoMessage

            // If we still can't find it, check specifically for the 'viewOnce: true' flag
            if (!content && (quoted.imageMessage?.viewOnce || quoted.videoMessage?.viewOnce)) {
                content = quoted.imageMessage || quoted.videoMessage
            }

            if (!content) return m.reply('❌ Could not find ViewOnce media.')

            // 3. Determine Type
            const isImage = content.mimetype?.includes('image')
            const mtype = isImage ? 'image' : 'video'

            // React (Stealth processing)
            await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

            // 4. Download
            // We pass the raw content content to the downloader
            const buffer = await downloadMedia({ msg: content, mtype: mtype })

            // 5. Send to Saved Messages (Silent)
            const myJid = conn.user.id.split(':')[0] + '@s.whatsapp.net'
            
            if (isImage) {
                await conn.sendMessage(myJid, { image: buffer, caption: 'Manual Recovery 🔓' })
            } else {
                await conn.sendMessage(myJid, { video: buffer, caption: 'Manual Recovery 🔓' })
            }

            // Success Reaction
            await conn.sendMessage(m.chat, { react: { text: '🕵️', key: m.key } })

        } catch (e) {
            console.error('VV Error:', e)
            m.reply('❌ Failed.')
        }
    }
}
