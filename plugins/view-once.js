// Set to keep track of recently processed messages to prevent duplicates
const processedMessages = new Set();

module.exports = {
    name: 'viewonce',
    description: 'Download view once messages and save to saved messages',
    aliases: ['vv', 'once'],
    tags: ['tools'],
    command: /^\.?(viewonce|vv|once)/i,

    async execute(sock, m) {
        // Check if this message has already been processed recently
        if (processedMessages.has(m.id)) {
            return; // Ignore duplicate trigger
        }
        
        // Add this message ID to the set of processed messages
        processedMessages.add(m.id);
        
        // Remove from set after a certain time to prevent memory buildup
        setTimeout(() => {
            processedMessages.delete(m.id);
        }, 10000); // Clear after 10 seconds
        try {
            if (!m.quoted) {
                return m.reply('Please reply to a view-once message to save it.');
            }

            const targetMsg = m.quoted;
            console.log('Quoted message types:', Object.keys(targetMsg.message || {}));

            let mediaBuffer, mimeType, fileName, mediaType;

            if (targetMsg.message?.imageMessage) {
                console.log('Downloading image...');
                mediaBuffer = await targetMsg.download();
                mimeType = targetMsg.message.imageMessage.mimetype || 'image/jpeg';
                fileName = `saved-image-${Date.now()}.jpg`;
                mediaType = 'image';

            } else if (targetMsg.message?.videoMessage) {
                console.log('Downloading video...');
                mediaBuffer = await targetMsg.download();
                mimeType = targetMsg.message.videoMessage.mimetype || 'video/mp4';
                fileName = `saved-video-${Date.now()}.mp4`;
                mediaType = 'video';

            } else if (targetMsg.message?.audioMessage) {
                console.log('Downloading audio...');
                mediaBuffer = await targetMsg.download();
                mimeType = targetMsg.message.audioMessage.mimetype || 'audio/ogg';
                fileName = `saved-audio-${Date.now()}.ogg`;
                mediaType = 'audio';

            } else {
                return m.reply('The replied message does not contain any downloadable media.');
            }

            console.log('Download successful, buffer size:', mediaBuffer.length);
            console.log('Media type:', mediaType);
            console.log('Mime type:', mimeType);

            if (mediaType === 'image') {
                await sock.sendMessage(sock.user.id, {
                    image: mediaBuffer,
                    mimetype: mimeType,
                    caption: 'View Once Image Saved'
                });
            } else if (mediaType === 'video') {
                await sock.sendMessage(sock.user.id, {
                    video: mediaBuffer,
                    mimetype: mimeType,
                    caption: 'View Once Video Saved'
                });
            } else if (mediaType === 'audio') {
                await sock.sendMessage(sock.user.id, {
                    audio: mediaBuffer,
                    mimetype: mimeType,
                    ptt: false
                });
            }

            console.log('Media saved and sent successfully');

        } catch (err) {
            console.error('Save media error:', err);
            m.reply('Failed to download media. Please try again.');
        }
    },
};
