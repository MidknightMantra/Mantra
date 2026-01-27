const { downloadMedia } = require('../lib/media')

module.exports = {
    cmd: 'vv',
    run: async (conn, m, args) => {
        try {
            const quoted = m.msg?.contextInfo?.quotedMessage
            if (!quoted) return m.reply('❌ Reply to a ViewOnce!')

            // 1. Identify ViewOnce
            let viewOnceMsg = quoted.viewOnceMessage || quoted.viewOnceMessageV2
            
            if (!viewOnceMsg) {
                if (quoted.imageMessage?.viewOnce || quoted.videoMessage?.viewOnce) {
                    viewOnceMsg = { message: quoted }
                }
            }

            if (!viewOnceMsg) return m.reply('❌ Not a ViewOnce.')

            // 2. Extract Content
            const content = viewOnceMsg.message.imageMessage || viewOnceMsg.message.videoMessage
            const isImage = !!viewOnceMsg.message.imageMessage
            
            // React instead of Replying (Stealthier)
            await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

            // 3. Download
            const buffer = await downloadMedia({ 
                msg: content, 
                mtype: isImage ? 'imageMessage' : 'videoMessage' 
            })

            // 4. Send to Saved Messages (Silent)
            const myJid = conn.user.id.split(':')[0] + '@s.whatsapp.net'
            
            if (isImage) {
                await conn.sendMessage(myJid, { image: buffer, caption: 'Manual Recovery 🔓' })
            } else {
                await conn.sendMessage(myJid, { video: buffer, caption: 'Manual Recovery 🔓' })
            }

            // 5. Success Reaction (No Text Reply)
            await conn.sendMessage(m.chat, { react: { text: '🕵️', key: m.key } })

        } catch (e) {
            console.error(e)
            // Only reply if it FAILS so you know it didn't work
            m.reply('❌ Failed.')
        }
    }
}
