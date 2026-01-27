export default {
    cmd: 'hidetag',
    run: async (conn, m, args, text) => {
        try {
            if (!m.isGroup) return m.reply('❌ Group command only.')
            if (!text && !m.msg?.contextInfo?.quotedMessage) return m.reply('❌ Text?')

            // 1. Get All Participants
            const groupMetadata = await conn.groupMetadata(m.chat)
            const participants = groupMetadata.participants.map(p => p.id)

            // 2. Determine Message Content
            // If replying to a message, use that message. If text, use text.
            const msgContent = m.msg?.contextInfo?.quotedMessage 
                ? m.msg.contextInfo.quotedMessage 
                : { conversation: text }

            // 3. Send Message with "Mentions" (Ghost Tag)
            // We attach the mentions array but don't write them in the text.
            // This tricks WhatsApp into notifying everyone.
            
            // If it's a media reply (image/video), we need to forward it with mentions
            if (m.msg?.contextInfo?.quotedMessage) {
                 await conn.sendMessage(m.chat, { forward: m.quoted, mentions: participants })
            } else {
                 await conn.sendMessage(m.chat, { text: text, mentions: participants })
            }

        } catch (e) {
            console.error(e)
            m.reply('❌ Error.')
        }
    }
}
