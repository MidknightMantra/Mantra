export default {
    cmd: 'admin', // logic to handle multiple commands
    run: async (conn, m, args, text) => {
        try {
            // 1. Check Group & Permissions
            if (!m.isGroup) return m.reply('❌ Groups only.')
            
            // Check if Bot is Admin
            const groupMetadata = await conn.groupMetadata(m.chat)
            const botId = conn.user.id.split(':')[0] + '@s.whatsapp.net'
            const botIsAdmin = groupMetadata.participants.find(p => p.id === botId)?.admin
            if (!botIsAdmin) return m.reply('❌ Make me Admin first!')

            // Check if User is Admin (or Owner)
            const senderId = m.sender
            const userIsAdmin = groupMetadata.participants.find(p => p.id === senderId)?.admin
            const isOwner = global.owner.includes(senderId.split('@')[0])
            
            if (!userIsAdmin && !isOwner) return m.reply('❌ You are not Admin.')

            // 2. Parse Command
            // We check which command triggered this plugin
            const command = m.body.split(' ')[0].toLowerCase().slice(1) // remove prefix
            
            // 3. Get Target User
            let users = m.mentions && m.mentions.length > 0 ? m.mentions : [m.quoted ? m.quoted.sender : null]
            if (!users[0]) return m.reply('❌ Tag or Reply to someone.')

            // 4. Execute Action
            switch (command) {
                case 'kick':
                    await conn.groupParticipantsUpdate(m.chat, users, 'remove')
                    m.reply(`👋 Begone!`)
                    break
                
                case 'add':
                    // Note: 'add' is restricted by WhatsApp privacy settings often
                    await conn.groupParticipantsUpdate(m.chat, users, 'add')
                    break
                
                case 'promote':
                    await conn.groupParticipantsUpdate(m.chat, users, 'promote')
                    m.reply(`👑 Promoted to Admin.`)
                    break
                
                case 'demote':
                    await conn.groupParticipantsUpdate(m.chat, users, 'demote')
                    m.reply(`📉 Demoted.`)
                    break
            }

        } catch (e) {
            console.error(e)
            m.reply('❌ Action failed.')
        }
    }
}
