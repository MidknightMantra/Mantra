module.exports = {
    name: 'groupinfo',
    aliases: ['ginfo', 'grouphelp'],
    description: 'Get detailed information about the current group',
    tags: ['group'],
    command: /^\.?(groupinfo|ginfo|grouphelp)/i,

    async execute(sock, m) {
        if (!m.isGroup) {
            return m.reply('This command can only be used in groups.');
        }

        try {
            const groupMetadata = m.groupMetadata;
            const participants = groupMetadata.participants;
            const adminList = participants.filter(p => p.admin).map(v => v.id);
            
            const groupName = groupMetadata.subject;
            const groupDesc = groupMetadata.desc || 'No description';
            const groupOwner = groupMetadata.owner || 'Unknown';
            const creationTime = new Date(groupMetadata.creation * 1000).toLocaleDateString();
            const memberCount = participants.length;
            const adminCount = adminList.length;
            
            const infoText = `
*「 Group Information 」*

*Name:* ${groupName}
*Description:* ${groupDesc}
*ID:* ${m.from}
*Created:* ${creationTime}
*Owner:* ${groupOwner.replace('@s.whatsapp.net', '')}
*Members:* ${memberCount}
*Admins:* ${adminCount}

*Admin List:*
${adminList.map((v, i) => `${i + 1}. @${v.split('@')[0]}`).join('\n')}
            `.trim();

            await sock.sendMessage(m.from, {
                text: infoText,
                mentions: adminList
            }, { quoted: m });
        } catch (err) {
            console.error('Group info error:', err);
            m.reply('Failed to get group info.');
        }
    }
};