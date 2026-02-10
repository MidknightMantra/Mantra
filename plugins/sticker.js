const { Sticker, StickerTypes } = require('wa-sticker-formatter');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

module.exports = {
    name: 'sticker',
    description: 'Convert an image or video to sticker with custom name',
    aliases: ['s', 'stkr', 'take', 'smeme'],
    tags: ['main'],
    command: /^(sticker|take|s|stkr|smeme)$/i,

    async execute(sock, m, args) {
        try {
            // Extract command name from the message
            const commandMatch = m.text.match(this.command);
            if (!commandMatch) return;
            const command = commandMatch[0].toLowerCase();

            // Handle meme sticker creation (with top and bottom text)
            if (command === 'smeme' || command === 'meme') {
                const textInput = args.join(' ');
                let top = '';
                let bottom = '';
                
                if (textInput.includes('|')) {
                    [top, bottom] = textInput.split('|').map(t => t.trim());
                } else {
                    [top, bottom] = [textInput, ''];
                }

                if (!m.quoted || !m.quoted.isMedia || !m.quoted.mimetype.startsWith('image')) {
                    return await m.reply('Please reply to an image with .smeme [top text]|[bottom text]\nExample: .smeme TOP TEXT|BOTTOM TEXT');
                }

                // Note: The wa-sticker-formatter library doesn't support meme text generation directly
                // For now, we'll just create a regular sticker with the text as caption
                const mediaBuffer = await m.quoted.download();
                
                const sticker = new Sticker(mediaBuffer, {
                    pack: 'Mantra Meme',
                    author: m.pushName || 'User',
                    type: StickerTypes.FULL,
                    quality: 50,
                    categories: ['🔥', '😂'],
                    id: Date.now().toString(),
                    link: 'https://github.com/MidknightXD/Mantra'
                });

                const stickerBuffer = await sticker.toBuffer();
                
                // Create meme-like text display
                const memeText = top || bottom ? 
                    `*MEME STICKER*\n\n${top ? `TOP: ${top}` : ''}\n${bottom ? `BOTTOM: ${bottom}` : ''}` : 
                    'MEME STICKER';
                
                await sock.sendMessage(m.from, {
                    sticker: stickerBuffer,
                    caption: memeText
                }, { quoted: m });

                return;
            }

            // Handle custom sticker pack creation
            if (command === 'take') {
                if (!args.trim()) {
                    return await m.reply('📝 *Usage:*\n`.take [pack name]|[author name]`\n\nExample:\n`.take My Pack|My Name`\n\nOr just:\n`.take My Pack`');
                }

                let packName = 'Mantra';
                let authorName = m.pushName || 'User';
                
                if (args.includes('|')) {
                    const [pName, aName] = args.split('|').map(str => str.trim());
                    packName = pName || packName;
                    authorName = aName || authorName;
                } else {
                    packName = args.trim();
                    authorName = m.pushName || 'User';
                }

                const target = m.quoted || m;
                
                if (!target.isMedia && !target.message?.imageMessage && !target.message?.videoMessage && !target.message?.stickerMessage) {
                    return await m.reply('❌ Please reply to an image, video, or sticker to create a custom pack.');
                }

                const mediaBuffer = await target.download();
                
                if (!mediaBuffer) {
                    return await m.reply('❌ Could not download the media. Please try again.');
                }

                // Determine sticker type based on media
                let stickerType = StickerTypes.DEFAULT;
                if (target.mimetype && target.mimetype.includes('gif')) {
                    stickerType = StickerTypes.CROPPED; // Animated stickers work better cropped
                }

                const sticker = new Sticker(mediaBuffer, {
                    pack: packName,
                    author: authorName,
                    type: stickerType,
                    quality: 50,
                    categories: ['🤩', '🎉', '✨'],
                    id: Date.now().toString(),
                    link: 'https://github.com/MidknightXD/Mantra'
                });

                const stickerBuffer = await sticker.toBuffer();

                await sock.sendMessage(m.from, {
                    sticker: stickerBuffer,
                    caption: `✅ Sticker created!\nPack: ${packName}\nAuthor: ${authorName}`
                }, { quoted: m });

                return;
            }

            // Handle regular sticker creation
            const target = m.quoted || m;
            
            if (!target.isMedia && !target.message?.imageMessage && !target.message?.videoMessage && !target.message?.stickerMessage) {
                return await m.reply(`📌 *Sticker Maker*\n\nSend or reply to an image/video with:\n• \`.sticker\` - Default Mantra sticker\n• \`.take [pack name]|[author name]\` - Custom sticker pack\n• \`.smeme [top text]|[bottom text]\` - Meme sticker\n\nExample: Reply to media and type \`.take My Pack|My Name\``);
            }

            const mediaBuffer = await target.download();
            
            if (!mediaBuffer) {
                return await m.reply('❌ Could not download the media. Please try again.');
            }

            // Determine if it's an animated sticker (GIF)
            let stickerType = StickerTypes.FULL; // Default to full display
            if (target.mimetype && target.mimetype.includes('gif')) {
                stickerType = StickerTypes.CROPPED; // For GIFs
            }

            const sticker = new Sticker(mediaBuffer, {
                pack: 'Mantra',
                author: m.pushName || 'User',
                type: stickerType,
                quality: 50,
                categories: ['🤩', '🎉', '✨'],
                id: Date.now().toString(),
                link: 'https://github.com/MidknightXD/Mantra'
            });

            const stickerBuffer = await sticker.toBuffer();

            await sock.sendMessage(m.from, {
                sticker: stickerBuffer
            }, { quoted: m });

            console.log(`✅ Sticker sent in chat ${m.from} | Pack: Mantra`);
        } catch (err) {
            console.error('❌ Sticker command error:', err);
            
            // More specific error messages
            if (err.message && err.message.includes('Max size')) {
                await m.reply('❌ Media file is too large. Please use an image/video under 1MB.');
            } else if (err.message && err.message.includes('not a valid')) {
                await m.reply('❌ Invalid media format. Please use a valid image or video.');
            } else {
                await m.reply('❌ Failed to create sticker. Make sure you\'re replying to a valid image or video.');
            }
        }
    }
};
