export default {
    cmd: 'hidetag',
    run: async (conn, m, args, text) => {
        try {
            if (!m.isGroup) return m.reply('❌ Groups only.')
            
            // 1. Get Metadata
            const groupMetadata = await conn.groupMetadata(m.chat)
            const participants = groupMetadata.participants.map(p => p.id)

            // 2. Prepare Message
            // We use the "mentions" array to trigger the notification
            // But we don't put the names in the text, so it's "invisible"
            
            // If replying to media
            if (m.quoted && m.quoted.mtype !== 'conversation') {
                 // Forward the quoted message with mentions
                 await conn.sendMessage(m.chat, { 
                     forward: m.quoted.fakeObj, 
                     mentions: participants 
                 })
            } else {
                 // Send text with mentions
                 await conn.sendMessage(m.chat, { 
                     text: text || (m.quoted?.text) || '📣 Notification', 
                     mentions: participants 
                 })
            }

        } catch (e) {
            console.error(e)
            m.reply('❌ Error.')
        }
    }
}
