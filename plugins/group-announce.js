module.exports = {
    name: 'announce',
    aliases: ['announce', 'shout'],
    description: 'Make group announcements (admins only)',
    tags: ['group'],
    command: /^\.?(announce|shout)/i,

    async execute(sock, m, args) {
        if (!m.isGroup) {
            return m.reply('This command can only be used in groups.');
        }

        const groupMetadata = m.groupMetadata;
        const isAdmin = groupMetadata.participants.find(p => p.id === m.sender)?.admin === 'admin' || 
                       groupMetadata.participants.find(p => p.id === m.sender)?.admin === 'superadmin';
        
        if (!isAdmin) {
            return m.reply('Only admins can make announcements.');
        }

        const announcementText = args.join(' ');
        if (!announcementText) {
            return m.reply('Please provide text for the announcement.\nUsage: .announce [message]');
        }

        try {
            // Mention all members in the announcement
            const participants = groupMetadata.participants.map(p => p.id);
            
            await sock.sendMessage(m.from, {
                text: `📢 *GROUP ANNOUNCEMENT*\n\n${announcementText}\n\n- ${m.pushName}`,
                mentions: participants
            });
        } catch (err) {
            console.error('Announce error:', err);
            m.reply('Failed to send announcement.');
        }
    }
};