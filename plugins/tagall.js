module.exports = {
    cmd: 'all',
    run: async (conn, m, args, text) => {
        try {
            // 1. Check if it's a group
            if (!m.isGroup) return m.reply('❌ This command is for groups only.')

            // 2. Fetch Group Data
            const groupMetadata = await conn.groupMetadata(m.chat)
            const participants = groupMetadata.participants
            
            // 3. Admin Check
            const groupAdmins = participants.filter(p => p.admin)
            const isAdmin = groupAdmins.find(admin => admin.id === m.sender)
            
            if (!isAdmin && !m.key.fromMe) return m.reply('❌ Admin privilege required.')

            // 4. Build the Message
            let message = `*📢 ATTENTION EVERYONE*\n`
            if (text) message += `*Message:* ${text}\n`
            message += `\n`

            for (let mem of participants) {
                message += `➥ @${mem.id.split('@')[0]}\n`
            }

            message += `\n*Total:* ${participants.length}`

            // 5. Send with Mentions
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
