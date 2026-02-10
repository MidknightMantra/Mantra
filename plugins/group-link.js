module.exports = {
    name: 'grouplink',
    aliases: ['linkgroup', 'invitelink'],
    description: 'Get or regenerate group invite link',
    tags: ['group'],
    command: /^\.?(grouplink|linkgroup|invitelink)/i,

    async execute(sock, m) {
        if (!m.isGroup) {
            return m.reply('This command can only be used in groups.');
        }

        const groupMetadata = m.groupMetadata;
        const isAdmin = groupMetadata.participants.find(p => p.id === m.sender)?.admin === 'admin' || 
                       groupMetadata.participants.find(p => p.id === m.sender)?.admin === 'superadmin';
        
        if (!isAdmin) {
            // Non-admins can only view the link if the group is not set to admin-only invites
            try {
                const groupLink = await sock.groupInviteCode(m.from);
                await m.reply(`Group Invite Link:\nhttps://chat.whatsapp.com/${groupLink}`);
            } catch (err) {
                m.reply('You need to be an admin to get the group link.');
            }
        } else {
            // Admins can get or regenerate the link
            try {
                if (m.text.includes('revoke') || m.text.includes('reset')) {
                    // Regenerate the invite link
                    const newCode = await sock.groupRevokeInvite(m.from);
                    await m.reply(`Group invite link has been regenerated:\nhttps://chat.whatsapp.com/${newCode}`);
                } else {
                    // Just get the current link
                    const groupLink = await sock.groupInviteCode(m.from);
                    await m.reply(`Group Invite Link:\nhttps://chat.whatsapp.com/${groupLink}`);
                }
            } catch (err) {
                console.error('Group link error:', err);
                m.reply('Failed to get/generate group link.');
            }
        }
    }
};