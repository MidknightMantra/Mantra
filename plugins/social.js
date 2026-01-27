import axios from 'axios'

export default {
    cmd: 'social',
    run: async (conn, m, args, text) => {
        try {
            // 1. Validation
            if (!text) return m.reply('❌ Please provide a link (TikTok, IG, FB, Twitter).')

            // 2. React (Processing)
            await conn.sendMessage(m.chat, { react: { text: '⬇️', key: m.key } })

            // 3. API Selector
            // We use a robust external API because scraping on Railway is blocked.
            let apiUrl = ''
            
            if (text.includes('tiktok.com')) {
                apiUrl = `https://api.giftedtech.my.id/api/download/tiktokdl?url=${text}&apikey=gifted`
            } else if (text.includes('instagram.com')) {
                apiUrl = `https://api.giftedtech.my.id/api/download/instagram?url=${text}&apikey=gifted`
            } else if (text.includes('facebook.com') || text.includes('fb.watch')) {
                apiUrl = `https://api.giftedtech.my.id/api/download/facebook?url=${text}&apikey=gifted`
            } else if (text.includes('twitter.com') || text.includes('x.com')) {
                apiUrl = `https://api.giftedtech.my.id/api/download/twitter?url=${text}&apikey=gifted`
            } else {
                return m.reply('❌ Link type not supported.')
            }

            // 4. Fetch Data
            const { data } = await axios.get(apiUrl)
            
            if (!data.success && !data.result) {
                return m.reply('❌ Download failed. The link might be private.')
            }

            // 5. Extract Media (Handling different API structures)
            let result = data.result
            
            // Handle Instagram Carousels (Multiple Slides)
            if (Array.isArray(result)) {
                 for (let media of result) {
                    if (media.type === 'video' || media.url.includes('.mp4')) {
                        await conn.sendMessage(m.chat, { video: { url: media.url }, caption: '⚡ Mantra Social' }, { quoted: m })
                    } else {
                        await conn.sendMessage(m.chat, { image: { url: media.url }, caption: '⚡ Mantra Social' }, { quoted: m })
                    }
                }
            } 
            // Handle Single Video/Image (TikTok, FB, Twitter)
            else {
                const url = result.url || result.video || result.hd || result.sd
                if (!url) return m.reply('❌ No media found.')

                // Detect Type based on extension or API tag
                if (url.includes('.mp4') || text.includes('tiktok') || text.includes('facebook')) {
                    await conn.sendMessage(m.chat, { video: { url: url }, caption: '⚡ Mantra Social' }, { quoted: m })
                } else {
                    await conn.sendMessage(m.chat, { image: { url: url }, caption: '⚡ Mantra Social' }, { quoted: m })
                }
            }

            // 6. Success Reaction
            await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

        } catch (e) {
            console.error(e)
            m.reply('❌ API Error. Try again later.')
        }
    }
}
