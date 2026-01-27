import { downloadMedia } from '../lib/media.js'

export default {
    cmd: 'vv',
    run: async (conn, m, args) => {
        try {
            // 1. Check for Quoted Message
            const quoted = m.msg?.contextInfo?.quotedMessage
            if (!quoted) return m.reply('❌ Reply to a ViewOnce message!')

            // 2. Identify ViewOnce Message
            let viewOnceMsg = quoted.viewOnceMessage || quoted.viewOnceMessageV2 || quoted.viewOnceMessageV2Extension
            
            // Check manual unwrap
            if (!viewOnceMsg) {
                if (quoted.imageMessage?.viewOnce || quoted.videoMessage?.viewOnce) {
                    viewOnceMsg = { message: quoted }
                }
            }

            if (!viewOnceMsg) return m.reply('❌ This is not a ViewOnce message.')

            // 3. Extract Media Content
            const content = viewOnceMsg.message.imageMessage || viewOnceMsg.message.videoMessage
            if (!content) return m.reply('❌ No media found.')

            // React (Processing)
            await conn.sendMessage(m.chat, { react: { text: '🕵️', key: m.key } })

            // 4. Download
            const mtype = content.mimetype.split('/')[0] === 'image' ? 'imageMessage' : 'videoMessage'
            const buffer = await downloadMedia({ msg: content, mtype: mtype })

            // 5. Send to SAVED MESSAGES (Private)
            const myJid = conn.user.id.split(':')[0] + '@s.whatsapp.net'
            const caption = `🔓 *ViewOnce Revealed*\nFrom: @${m.sender.split('@')[0]}\nChat: ${m.isGroup ? 'Group' : 'DM'}`

            if (mtype === 'imageMessage') {
                await conn.sendMessage(myJid, { image: buffer, caption: caption, mentions: [m.sender] })
            } else {
                await conn.sendMessage(myJid, { video: buffer, caption: caption, mentions: [m.sender] })
            }

            // 6. Confirm in Chat (Reaction Only)
            await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

        } catch (e) {
            console.error(e)
            m.reply('❌ Failed to reveal.')
        }
    }
}
