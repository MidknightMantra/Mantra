const axios = require('axios') // You need to install axios if you haven't: npm install axios

module.exports = {
    cmd: 'social',
    run: async (conn, m, args, text) => {
        try {
            // 1. Validation
            if (!text) return m.reply('❌ Please provide a TikTok, Instagram, FB, or Twitter link.\nExample: *,social https://tiktok.com/xyz*')

            // 2. React (Processing)
            await conn.sendMessage(m.chat, { react: { text: '⬇️', key: m.key } })

            // 3. API Selection based on URL
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
                return m.reply('❌ Link not supported. Only TikTok, IG, FB, and Twitter.')
            }

            // 4. Fetch Media Data
            const response = await axios.get(apiUrl)
            const data = response.data
            
            if (!data || !data.success) {
                // If the first API fails, you can add a fallback here, but usually, this means the link is private/invalid.
                return m.reply('❌ Failed to download. Ensure the profile/video is public.')
            }

            // 5. Extract the Direct Video URL
            // Different APIs return different structures, so we normalize it.
            let videoUrl = ''
            if (data.result && data.result.url) videoUrl = data.result.url
            else if (data.result && data.result.video) videoUrl = data.result.video
            else if (data.result && Array.isArray(data.result)) videoUrl = data.result[0].url // Instagram often returns an array
            
            if (!videoUrl) return m.reply('❌ Could not find video URL.')

            // 6. Send Video
            await conn.sendMessage(m.chat, { 
                video: { url: videoUrl }, 
                caption: 'Downloaded via *Mantra* ⚡' 
            }, { quoted: m })

            await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

        } catch (e) {
            console.error(e)
            m.reply('❌ Downloader Error. (API might be busy)')
        }
    }
}
