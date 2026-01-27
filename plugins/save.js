const { downloadMedia } = require('../lib/media')

module.exports = {
    cmd: 'save',
    run: async (conn, m, args) => {
        try {
            // 1. Check Quote
            const quoted = m.msg?.contextInfo?.quotedMessage
            if (!quoted) return m.reply('❌ Reply to something to save!')

            // 2. Identify Media
            let messageType = Object.keys(quoted)[0]
            let mediaMsg = quoted[messageType]

            // Handle ViewOnce wrappers
            if (messageType === 'viewOnceMessage' || messageType === 'viewOnceMessageV2') {
                mediaMsg = quoted[messageType].message.imageMessage || quoted[messageType].message.videoMessage
                messageType = mediaMsg.mimetype.split('/')[0] + 'Message'
            }

            if (!mediaMsg || !mediaMsg.mimetype) return m.reply('❌ No media found.')

            // React (Processing)
            await conn.sendMessage(m.chat, { react: { text: '⬇️', key: m.key } })

            // 3. Download
            const type = messageType.replace('Message', '')
            const buffer = await downloadMedia({ msg: mediaMsg, mtype: type })

            // 4. Send to SAVED MESSAGES (Your own DM)
            // We calculate your own ID from the bot's connection info
            const myJid = conn.user.id.split(':')[0] + '@s.whatsapp.net'
            const caption = `💾 *Saved from:* @${m.sender.split('@')[0]}`

            if (type === 'image') {
                await conn.sendMessage(myJid, { image: buffer, caption: caption, mentions: [m.sender] })
            } else if (type === 'video') {
                await conn.sendMessage(myJid, { video: buffer, caption: caption, mentions: [m.sender] })
            } else if (type === 'audio') {
                await conn.sendMessage(myJid, { audio: buffer, mimetype: 'audio/mp4' })
            } else if (type === 'sticker') {
                await conn.sendMessage(myJid, { sticker: buffer })
            }

            // 5. Success Reaction (In original chat)
            await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

        } catch (e) {
            console.error(e)
            m.reply('❌ Failed to save.')
        }
    }
}
