module.exports = {
    cmd: 'all',
    run: async (conn, m, args, text) => {
        try {
            console.log('📢 Triggering Tag-All...')

            // 1. Check Group
            if (!m.isGroup) return m.reply('❌ Groups only!')

            // 2. Fetch Metadata (Protected)
            // This is the network call that usually fails
            const groupMetadata = await conn.groupMetadata(m.chat).catch(e => {
                console.error('Failed to fetch metadata:', e)
                return null
            })

            if (!groupMetadata) return m.reply('❌ Failed to fetch members. Try again in 5 seconds.')

            const participants = groupMetadata.participants || []
            
            // 3. Robust Admin Check
            // We compare the bare number (split at @) and check admin status
            const senderNumber = m.sender.split('@')[0].split(':')[0]
            
            const isAdmin = participants.find(p => 
                p.id.split('@')[0].split(':')[0] === senderNumber && 
                (p.admin === 'admin' || p.admin === 'superadmin')
            )
            
            if (!isAdmin && !m.key.fromMe) return m.reply('❌ Admin privilege required.')

            // 4. Build Message
            let message = `*📢 EVERYONE WAKE UP*\n`
            if (text) message += `*Message:* ${text}\n`
            message += `\n`

            for (let mem of participants) {
                message += `➥ @${mem.id.split('@')[0]}\n`
            }

            message += `\n*Total:* ${participants.length}`

            // 5. Send
            await conn.sendMessage(m.chat, { 
                text: message, 
                mentions: participants.map(a => a.id) 
            }, { quoted: m })

            console.log('✅ Tag-All Sent')

        } catch (e) {
            console.error('TagAll Error:', e)
            m.reply('❌ Error executing command.')
        }
    }
}
