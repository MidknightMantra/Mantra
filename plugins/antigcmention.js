// Object to track users who have been warned about mentioning groups in status
const warnedUsers = {};

module.exports = {
    name: 'antigcmention',
    aliases: ['antigcm', 'antigroupmention'],
    description: 'Prevent group mentions in status updates (warns first, kicks on repeat)',
    tags: ['group', 'moderation'],

    async execute(sock, m, args) {
        if (!m.isGroup) {
            return m.reply('This command can only be used in groups.');
        }

        const groupMetadata = m.groupMetadata;
        const isAdmin = groupMetadata.participants.find(p => p.id === m.sender)?.admin === 'admin' || 
                       groupMetadata.participants.find(p => p.id === m.sender)?.admin === 'superadmin';
        
        if (!isAdmin) {
            return m.reply('Only admins can configure anti-gc-mention settings.');
        }

        // Initialize global variable if it doesn't exist
        if (!global.antigcmention) {
            global.antigcmention = {};
        }

        if (!args[0]) {
            const isEnabled = global.antigcmention[m.from] || false;
            return m.reply(`
*Anti-GC-Mention Settings:*

Current status: ${isEnabled ? 'ON' : 'OFF'}

Usage:
• .antigcmention on - Enable anti-gc-mention
• .antigcmention off - Disable anti-gc-mention
            `.trim());
        }

        const option = args[0].toLowerCase();
        
        if (option === 'on') {
            global.antigcmention[m.from] = true;
            await m.reply('Anti-GC-Mention has been enabled for this group.\nMembers who mention the group in status updates will be warned first, then kicked if they repeat it.');
        } else if (option === 'off') {
            global.antigcmention[m.from] = false;
            await m.reply('Anti-GC-Mention has been disabled for this group.');
        } else {
            m.reply('Invalid option. Use ".antigcmention on" or ".antigcmention off"');
        }
    },

    // This function will be called when any message is received
    async onMessage(sock, m) {
        // Check if this is a status update (broadcast) message
        if (m.from === 'status@broadcast') {
            try {
                // Get all mentioned JIDs in the status
                const contextInfo = m.message?.extendedTextMessage?.contextInfo || 
                                  m.message?.imageMessage?.contextInfo || 
                                  m.message?.videoMessage?.contextInfo || 
                                  m.message?.audioMessage?.contextInfo || 
                                  m.message?.documentMessage?.contextInfo || 
                                  m.message?.stickerMessage?.contextInfo || 
                                  {};
                                  
                const mentionedJids = contextInfo.mentionedJid || [];
                
                // Check if any mentioned jid is a group
                const groupMentions = mentionedJids.filter(jid => jid.endsWith('@g.us'));
                
                if (groupMentions.length > 0) {
                    // Check if anti-gc-mention is enabled for any of the mentioned groups
                    for (const groupId of groupMentions) {
                        // Check if anti-gc-mention is enabled for this group
                        if (global.antigcmention && global.antigcmention[groupId]) {
                            try {
                                // Get group metadata to check if the sender is a member
                                const groupMetadata = await sock.groupMetadata(groupId);
                                const isMember = groupMetadata.participants.some(p => p.id === m.sender);
                                
                                if (isMember) {
                                    // Check if this user has already been warned for this group
                                    const userWarnKey = `${m.sender}_${groupId}`;
                                    
                                    if (warnedUsers[userWarnKey]) {
                                        // User was already warned, now kick them
                                        try {
                                            await sock.groupParticipantsUpdate(groupId, [m.sender], 'remove');
                                            
                                            // Notify in the group
                                            await sock.sendMessage(groupId, {
                                                text: `@${m.sender.split('@')[0]} was kicked for mentioning the group in status after being warned.`,
                                                mentions: [m.sender]
                                            });
                                            
                                            // Remove from warned list
                                            delete warnedUsers[userWarnKey];
                                        } catch (kickErr) {
                                            console.error('Failed to kick user:', kickErr);
                                        }
                                    } else {
                                        // First time mentioning, warn them
                                        try {
                                            // Add to warned list
                                            warnedUsers[userWarnKey] = Date.now();
                                            
                                            // Send warning to the user in DM
                                            await sock.sendMessage(m.sender, {
                                                text: `⚠️ Warning: You mentioned a group in your status update. Repeating this will result in being kicked from the group.`
                                            });
                                            
                                            // Also notify in the group
                                            await sock.sendMessage(groupId, {
                                                text: `@${m.sender.split('@')[0]} was warned for mentioning the group in status. Repeating this will result in being kicked.`,
                                                mentions: [m.sender]
                                            });
                                        } catch (warnErr) {
                                            console.error('Failed to warn user:', warnErr);
                                        }
                                        
                                        // Clean up the warning after 1 hour
                                        setTimeout(() => {
                                            delete warnedUsers[userWarnKey];
                                        }, 60 * 60 * 1000); // 1 hour
                                    }
                                }
                            } catch (err) {
                                // Group might not be accessible or other error
                                console.error('Error processing group mention:', err);
                            }
                        }
                    }
                }
            } catch (err) {
                console.error('Error in antigcmention onMessage:', err);
            }
        }
    }
};