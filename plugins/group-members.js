module.exports = {
    name: 'members',
    aliases: ['participants', 'listmem'],
    description: 'List group members with additional options',
    tags: ['group'],
    command: /^\.?(members|participants|listmem)/i,

    async execute(sock, m) {
        if (!m.isGroup) {
            return m.reply('This command can only be used in groups.');
        }

        try {
            const groupMetadata = m.groupMetadata;
            const participants = groupMetadata.participants;
            const adminList = participants.filter(p => p.admin).map(v => v.id);
            
            if (!m.text) {
                // Show basic member list
                const memberList = participants
                    .map((v, i) => `${i + 1}. ${v.admin ? '👑 ' : ''}@${v.id.split('@')[0]}`)
                    .join('\n');
                
                await sock.sendMessage(m.from, {
                    text: `*Group Members (${participants.length})*\n\n${memberList}`,
                    mentions: participants.map(v => v.id)
                }, { quoted: m });
            } else {
                const args = m.text.split(' ');
                const option = args[1]?.toLowerCase();
                
                switch (option) {
                    case 'admins':
                        const adminNames = adminList
                            .map((v, i) => `${i + 1}. @${v.split('@')[0]}`)
                            .join('\n');
                        
                        await sock.sendMessage(m.from, {
                            text: `*Group Admins (${adminList.length})*\n\n${adminNames}`,
                            mentions: adminList
                        }, { quoted: m });
                        break;
                        
                    case 'nonadmins':
                        const nonAdmins = participants
                            .filter(p => !p.admin)
                            .map((v, i) => `${i + 1}. @${v.id.split('@')[0]}`)
                            .join('\n');
                        
                        const nonAdminIds = participants
                            .filter(p => !p.admin)
                            .map(p => p.id);
                        
                        await sock.sendMessage(m.from, {
                            text: `*Non-Admin Members (${nonAdmins.length})*\n\n${nonAdmins}`,
                            mentions: nonAdminIds
                        }, { quoted: m });
                        break;
                        
                    case 'count':
                        const adminCount = adminList.length;
                        const memberCount = participants.length;
                        const nonAdminCount = memberCount - adminCount;
                        
                        await m.reply(`
*Group Statistics:*
• Total Members: ${memberCount}
• Admins: ${adminCount}
• Non-Admins: ${nonAdminCount}
• Bot: ${sock.user.name}
                        `.trim());
                        break;
                        
                    default:
                        m.reply('Options: .members admins | .members nonadmins | .members count');
                }
            }
        } catch (err) {
            console.error('Members list error:', err);
            m.reply('Failed to get member list.');
        }
    }
};