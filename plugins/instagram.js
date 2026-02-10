const axios = require('axios');
const cheerio = require('cheerio');

module.exports = {
    name: 'instagram',
    aliases: ['ig', 'igdl', 'instadl'],
    description: 'Download Instagram posts/videos',
    tags: ['downloader'],
    command: /^\.?(instagram|ig|igdl|instadl)/i,

    async execute(sock, m, args) {
        const url = args[0];
        
        if (!url) {
            return m.reply('Please provide an Instagram URL.\nExample: .ig https://www.instagram.com/p/B153...');
        }

        if (!url.includes('instagram.com') && !url.includes('instagr.am')) {
            return m.reply('Please provide a valid Instagram URL.');
        }

        try {
            await m.reply('⏳ Downloading Instagram content...');

            // Using snapinsta.to API
            const response = await axios.post('https://snapinsta.app/action.php', 
                new URLSearchParams({
                    url: url,
                    action: 'post',
                    token: ''
                }), 
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Referer': 'https://snapinsta.app/',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                    }
                }
            );

            const $ = cheerio.load(response.data);
            const downloadLinks = [];
            
            // Extract download links
            $('table').find('a[href*="download"]').each(function() {
                const href = $(this).attr('href');
                if (href && !href.includes('javascript')) {
                    // Convert relative URLs to absolute
                    const fullUrl = href.startsWith('http') ? href : 'https://snapinsta.app/' + href;
                    downloadLinks.push(fullUrl);
                }
            });

            if (downloadLinks.length === 0) {
                // Alternative method - try to find video/image elements
                const videoUrl = $('video').attr('src');
                const imageUrl = $('img.d-flex').attr('src');
                
                if (videoUrl) {
                    await sock.sendMessage(m.from, {
                        video: { url: videoUrl },
                        caption: '📹 Instagram Video Downloaded by Mantra Bot'
                    }, { quoted: m });
                } else if (imageUrl) {
                    await sock.sendMessage(m.from, {
                        image: { url: imageUrl },
                        caption: '🖼️ Instagram Photo Downloaded by Mantra Bot'
                    }, { quoted: m });
                } else {
                    return m.reply('❌ Could not find download links. The content might be private or unavailable.');
                }
            } else {
                // Download the first available link
                for (const link of downloadLinks) {
                    try {
                        if (link.includes('.mp4')) {
                            await sock.sendMessage(m.from, {
                                video: { url: link },
                                caption: '📹 Instagram Video Downloaded by Mantra Bot'
                            }, { quoted: m });
                        } else if (link.includes('.jpg') || link.includes('.jpeg') || link.includes('.png')) {
                            await sock.sendMessage(m.from, {
                                image: { url: link },
                                caption: '🖼️ Instagram Photo Downloaded by Mantra Bot'
                            }, { quoted: m });
                        }
                        break; // Only download the first valid media
                    } catch (downloadErr) {
                        console.error('Download error:', downloadErr.message);
                        continue;
                    }
                }
            }
        } catch (err) {
            console.error('Instagram download error:', err);
            m.reply('❌ Failed to download Instagram content. Please check the URL or try again later.');
        }
    }
};