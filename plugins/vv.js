const { downloadMedia } = require('../lib/media')

module.exports = {
    cmd: 'vv',
    run: async (conn, m, args) => {
        try {
            // 1. Check if the user replied to a message
            const quoted = m.msg?.contextInfo?.quotedMessage
            if (!quoted) return m.reply('❌ Reply to a ViewOnce message with ,vv')

            // 2. Identify the ViewOnce Message
            // ViewOnce messages are wrapped inside 'viewOnceMessage' or 'viewOnceMessageV2'
            let viewOnceMsg = quoted.viewOnceMessage || quoted.viewOnceMessageV2
            
            // If it's not strictly wrapped, check if the quoted message itself has 'viewOnce: true'
            if (!viewOnceMsg) {
                if (quoted.imageMessage?.viewOnce || quoted.videoMessage?.viewOnce) {
                    viewOnceMsg = {
                        message: quoted
                    }
                }
            }

            if (!viewOnceMsg) return m.reply('❌ This is not a ViewOnce message.')

            // 3. Get the inner content (Image or Video)
            const content = viewOnceMsg.message.imageMessage || viewOnceMsg.message.videoMessage
            const isImage = !!viewOnceMsg.message.imageMessage
            
            // 4. Decrypt and Download
            // We construct a fake message object to pass to our download helper
            const mediaObject = {
                msg: content,
                mtype: isImage ? 'imageMessage' : 'videoMessage'
            }
            
            // React to show we are working
            await conn.sendMessage(m.chat, { react: { text: '🕵️', key: m.key } })

            const buffer = await downloadMedia(mediaObject)

            // 5. Send to "Saved Messages" (The Bot's Own DM)
            // conn.user.id is the bot's number. We strip the suffix to get the JID.
            const savedMessagesJid = conn.user.id.split(':')[0] + '@s.whatsapp.net'

            if (isImage) {
                await conn.sendMessage(savedMessagesJid, { 
                    image: buffer, 
                    caption: `🕵️ *Recovered ViewOnce*\nFrom: @${m.sender.split('@')[0]}`,
                    mentions: [m.sender]
                })
            } else {
                await conn.sendMessage(savedMessagesJid, { 
                    video: buffer, 
                    caption: `🕵️ *Recovered ViewOnce*\nFrom: @${m.sender.split('@')[0]}`,
                    mentions: [m.sender]
                })
            }

            // 6. Confirm in the group (Silently)
            await m.reply('✅ Media sent to your Saved Messages.')

        } catch (e) {
            console.error(e)
            m.reply('❌ Failed to decrypt ViewOnce.')
        }
    }
}
