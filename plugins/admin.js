export default {
    // These triggers are automatically registered by your main.js loader
    cmd: ['kick', 'add', 'promote', 'demote', 'hidetag', 'tagall'],
    run: async (conn, m, { args, command }) => {
        try {
            // 1. Group & Permission Guard
            if (!m.isGroup) return m.reply('❌ This command can only be used in groups.')
            
            const groupMetadata = await conn.groupMetadata(m.chat)
            const participants = groupMetadata.participants
            const botId = conn.user.id.split(':')[0] + '@s.whatsapp.net'
            
            // Check if Bot is Admin
            const botIsAdmin = participants.find(p => p.id === botId)?.admin
            if (!botIsAdmin) return m.reply('❌ I need to be an *Admin* to perform this action.')

            // Check if Sender is Admin or Owner
            const isOwner = global.owner?.includes(m.sender.split('@')[0])
            const isAdmin = participants.find(p => p.id === m.sender)?.admin
            if (!isAdmin && !isOwner) return m.reply('❌ Only group admins can use this command.')

            // 2. Identify Target User (Tag, Reply, or Number)
            let users = m.mentions && m.mentions.length > 0 ? m.mentions : [m.quoted ? m.quoted.sender : null]
            
            // Handle specialized commands that don't need a target user
            if (command === 'hidetag' || command === 'tagall') {
                const message = args.join(' ') || '📢 Attention Everyone!'
                const jids = participants.map(v => v.id)
                return await conn.sendMessage(m.chat, { text: message, mentions: jids })
            }

            // Target Validation for kick/add/promote/demote
            if (!users[0]) return m.reply('❌ Please tag a user or reply to their message.')
            const target = users[0]

            // 3. Execution Logic
            switch (command) {
                case 'kick':
                    if (target === botId) return m.reply('🛡️ I cannot kick myself.')
                    await conn.groupParticipantsUpdate(m.chat, [target], 'remove')
                    break
                
                case 'add':
                    // Note: 'add' often fails if the user has private invite settings
                    await conn.groupParticipantsUpdate(m.chat, [target], 'add')
                    m.reply('✅ User added.')
                    break
                
                case 'promote':
                    await conn.groupParticipantsUpdate(m.chat, [target], 'promote')
                    m.reply('👑 User is now an Admin.')
                    break
                
                case 'demote':
                    await conn.groupParticipantsUpdate(m.chat, [target], 'demote')
                    m.reply('📉 User has been demoted.')
                    break
            }

            await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

        } catch (e) {
            console.error('Admin Plugin Error:', e)
            m.reply('⚠️ Action failed. Ensure the user is still in the group.')
        }
    }
}
