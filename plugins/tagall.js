module.exports = {
    cmd: 'all',
    run: async (conn, m, args, text) => {
        try {
            // 1. Check Group
            if (!m.isGroup) return m.reply('❌ Groups only!')

            // 2. Fetch Metadata
            // We need this to get the list of victims (participants)
            const groupMetadata = await conn.groupMetadata(m.chat).catch(e => {
                console.error('Failed to fetch metadata:', e)
                return null
            })

            if (!groupMetadata) return m.reply('❌ Failed to fetch members.')

            const participants = groupMetadata.participants || []
            
            // --- ADMIN CHECK REMOVED ---
            // The code that stopped you is gone.
            // ---------------------------

            // 3. Build Message
            let message = `*📢 ATTENTION EVERYONE*\n`
            if (text) message += `*Message:* ${text}\n`
            message += `\n`

            for (let mem of participants) {
                message += `➥ @${mem.id.split('@')[0]}\n`
            }

            message += `\n*Total:* ${participants.length}`

            // 4. Send with Mentions
            await conn.sendMessage(m.chat, { 
                text: message, 
                mentions: participants.map(a => a.id) 
            }, { quoted: m })

        } catch (e) {
            console.error(e)
            m.reply('❌ Failed to tag all.')
        }
    }
}
