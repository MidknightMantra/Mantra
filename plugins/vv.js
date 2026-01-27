import { downloadMedia } from '../lib/media.js'

export default {
    cmd: 'vv',
    run: async (conn, m, args) => {
        try {
            // 1. Get Raw Quoted Message
            // We use the raw contextInfo to ensure we get the ViewOnce structure
            let quoted = m.msg?.contextInfo?.quotedMessage
            if (!quoted) return m.reply('❌ Please reply to a ViewOnce message.')

            // 2. Unwrap the ViewOnce Message safely
            // Iterate through possible ViewOnce keys to find the content
            let viewOnceNode = quoted.viewOnceMessageV2 || quoted.viewOnceMessage || quoted.viewOnceMessageV2Extension
            
            // If it's not wrapped in a standard ViewOnce container, check if the inner message is marked viewOnce
            if (!viewOnceNode) {
                if (quoted.imageMessage?.viewOnce || quoted.videoMessage?.viewOnce) {
                    viewOnceNode = { message: quoted }
                }
            }

            if (!viewOnceNode || !viewOnceNode.message) {
                return m.reply('❌ This is not a valid ViewOnce message.')
            }

            // 3. Extract the actual Media Content (Image/Video)
            // We look inside the .message property
            const innerMsg = viewOnceNode.message
            const content = innerMsg.imageMessage || innerMsg.videoMessage
            
            if (!content) return m.reply('❌ No media found inside this ViewOnce.')

            // React to show processing
            await conn.sendMessage(m.chat, { react: { text: '🔓', key: m.key } })

            // 4. Download Media
            // Determine type explicitly
            const isImage = !!innerMsg.imageMessage
            const mtype = isImage ? 'imageMessage' : 'videoMessage'

            // Download using your library
            const buffer = await downloadMedia({ msg: content, mtype: mtype })
            
            if (!buffer) throw new Error('Download failed: Buffer is empty')

            // 5. Send to Saved Messages (Bot's DM)
            // Safer way to get Bot's JID
            const botId = conn.user.id || conn.user.jid
            const myJid = botId.split(':')[0] + '@s.whatsapp.net'
            
            const caption = `🔓 *ViewOnce Revealed*\n\n👤 *From:* @${m.sender.split('@')[0]}\n📍 *Chat:* ${m.isGroup ? 'Group' : 'DM'}`

            if (isImage) {
                await conn.sendMessage(myJid, { image: buffer, caption: caption, mentions: [m.sender] })
            } else {
                await conn.sendMessage(myJid, { video: buffer, caption: caption, mentions: [m.sender] })
            }

            // 6. Confirm in Chat
            await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

        } catch (e) {
            console.error('VV Error:', e)
            m.reply('❌ Failed to reveal.')
        }
    }
}
