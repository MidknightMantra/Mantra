module.exports = {
    name: 'group',
    aliases: ['grup', 'settings'],
    description: 'Manage group settings (admins only)',
    tags: ['group'],
    command: /^\.?(group|grup|settings)/i,

    async execute(sock, m, args) {
        if (!m.isGroup) {
            return m.reply('This command can only be used in groups.');
        }

        const groupMetadata = m.groupMetadata;
        const isAdmin = groupMetadata.participants.find(p => p.id === m.sender)?.admin === 'admin' || 
                       groupMetadata.participants.find(p => p.id === m.sender)?.admin === 'superadmin';
        
        if (!isAdmin) {
            return m.reply('Only admins can use this command.');
        }

        if (!args[0]) {
            return m.reply(`
*Group Settings:*

Usage: .group [option] [value]

Options:
• .group open - Open group invite link
• .group close - Close group invite link  
• .group desc [text] - Change group description
• .group subject [text] - Change group name
• .group icon [reply to image] - Change group picture
• .group add [number] - Add participant
• .group kick [number] - Kick participant
• .group promote [number] - Promote to admin
• .group demote [number] - Demote from admin
            `.trim());
        }

        const option = args[0].toLowerCase();
        
        switch (option) {
            case 'open':
            case 'close':
                try {
                    await sock.groupSettingUpdate(m.from, option === 'open' ? 'not_announcement' : 'announcement');
                    await m.reply(`Group settings updated: ${option === 'open' ? 'Members can now send messages' : 'Only admins can send messages'}`);
                } catch (err) {
                    console.error('Group setting error:', err);
                    m.reply('Failed to update group settings.');
                }
                break;
                
            case 'desc':
                try {
                    const newDesc = args.slice(1).join(' ');
                    if (!newDesc) return m.reply('Please provide a description.');
                    
                    await sock.groupUpdateDescription(m.from, newDesc);
                    await m.reply('Group description updated successfully.');
                } catch (err) {
                    console.error('Update desc error:', err);
                    m.reply('Failed to update group description.');
                }
                break;
                
            case 'subject':
                try {
                    const newSubject = args.slice(1).join(' ');
                    if (!newSubject) return m.reply('Please provide a subject.');
                    
                    await sock.groupUpdateSubject(m.from, newSubject);
                    await m.reply('Group subject updated successfully.');
                } catch (err) {
                    console.error('Update subject error:', err);
                    m.reply('Failed to update group subject.');
                }
                break;
                
            case 'icon':
                try {
                    if (!m.quoted || !m.quoted.isMedia || !m.quoted.mimetype.startsWith('image')) {
                        return m.reply('Reply to an image with .group icon');
                    }
                    
                    const mediaBuffer = await m.quoted.download();
                    await sock.updateProfilePicture(m.from, { url: mediaBuffer });
                    await m.reply('Group icon updated successfully.');
                } catch (err) {
                    console.error('Update icon error:', err);
                    m.reply('Failed to update group icon.');
                }
                break;
                
            case 'add':
                try {
                    const number = args[1];
                    if (!number) return m.reply('Please provide a phone number to add.');
                    
                    const cleanNumber = number.replace(/[\s+-]/g, '');
                    const fullNumber = cleanNumber.startsWith('0') ? 
                        '62' + cleanNumber.slice(1) + '@s.whatsapp.net' : 
                        cleanNumber + '@s.whatsapp.net';
                    
                    await sock.groupParticipantsUpdate(m.from, [fullNumber], 'add');
                    await m.reply(`@${fullNumber.split('@')[0]} added to the group.`, null, { mentions: [fullNumber] });
                } catch (err) {
                    console.error('Add participant error:', err);
                    m.reply('Failed to add participant. They may have privacy settings enabled or the number is invalid.');
                }
                break;
                
            case 'kick':
                try {
                    if (!m.quoted) return m.reply('Reply to the user you want to kick.');
                    
                    const user = m.quoted.sender;
                    if (user === sock.user.id) return m.reply('Cannot kick myself.');
                    
                    await sock.groupParticipantsUpdate(m.from, [user], 'remove');
                    await m.reply(`@${user.split('@')[0]} kicked from the group.`, null, { mentions: [user] });
                } catch (err) {
                    console.error('Kick participant error:', err);
                    m.reply('Failed to kick participant.');
                }
                break;
                
            case 'promote':
                try {
                    if (!m.quoted) return m.reply('Reply to the user you want to promote.');
                    
                    const user = m.quoted.sender;
                    await sock.groupParticipantsUpdate(m.from, [user], 'promote');
                    await m.reply(`@${user.split('@')[0]} promoted to admin.`, null, { mentions: [user] });
                } catch (err) {
                    console.error('Promote participant error:', err);
                    m.reply('Failed to promote participant.');
                }
                break;
                
            case 'demote':
                try {
                    if (!m.quoted) return m.reply('Reply to the user you want to demote.');
                    
                    const user = m.quoted.sender;
                    if (user === sock.user.id) return m.reply('Cannot demote myself.');
                    
                    await sock.groupParticipantsUpdate(m.from, [user], 'demote');
                    await m.reply(`@${user.split('@')[0]} demoted from admin.`, null, { mentions: [user] });
                } catch (err) {
                    console.error('Demote participant error:', err);
                    m.reply('Failed to demote participant.');
                }
                break;
                
            default:
                m.reply('Invalid option. Use ".group" to see available options.');
        }
    }
};