module.exports = {
    cmd: 'all',
    run: async (conn, m, args, text) => {
        try {
            // 1. Check Group
            if (!m.isGroup) return m.reply('❌ Groups only!')

            // 2. Fetch Metadata (Silently)
            const groupMetadata = await conn.groupMetadata(m.chat).catch(e => {})
            if (!groupMetadata) return m.reply('❌ Failed to fetch participants.')

            const participants = groupMetadata.participants
            
            // 3. Extract IDs (The Hidden Payload)
            // We map the participants to just their IDs.
            const mentions = participants.map(p => p.id)

            // 4. Send the Ghost Message
            // We send the user's text (or a default dot) and attach the mentions array.
            // Since the names are not in the 'text' string, they remain invisible.
            await conn.sendMessage(m.chat, { 
                text: text || '.', // Default to a dot if no text provided
                mentions: mentions 
            }, { quoted: m })

        } catch (e) {
            console.error(e)
            // Fail silently or react to keep it clean
            conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
        }
    }
}
