const axios = require('axios')

module.exports = {
    cmd: 'ig',
    run: async (conn, m, args, text) => {
        try {
            if (!text) return m.reply('❌ Send an Instagram link.\nExample: *,ig https://www.instagram.com/p/CXYZ*')

            // React (Processing)
            await conn.sendMessage(m.chat, { react: { text: '📸', key: m.key } })

            // We use a dedicated IG endpoint that supports Carousels (Slides)
            // This API acts like Snapinsta backend
            const apiUrl = `https://api.giftedtech.my.id/api/download/instagram?url=${text}&apikey=gifted`
            
            const response = await axios.get(apiUrl)
            const data = response.data

            if (!data.success) return m.reply('❌ Private Account or Invalid Link.')

            const results = data.result

            // Handle multiple results (Carousels/Slides)
            if (Array.isArray(results)) {
                for (let media of results) {
                    if (media.type === 'video') {
                        await conn.sendMessage(m.chat, { video: { url: media.url }, caption: '📸 *Mantra IG*' }, { quoted: m })
                    } else {
                        await conn.sendMessage(m.chat, { image: { url: media.url }, caption: '📸 *Mantra IG*' }, { quoted: m })
                    }
                }
            } 
            // Handle Single Result
            else {
                if (results.url.includes('.mp4')) {
                    await conn.sendMessage(m.chat, { video: { url: results.url }, caption: '📸 *Mantra IG*' }, { quoted: m })
                } else {
                    await conn.sendMessage(m.chat, { image: { url: results.url }, caption: '📸 *Mantra IG*' }, { quoted: m })
                }
            }

            await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

        } catch (e) {
            console.error(e)
            m.reply('❌ Failed. The API might be down.')
        }
    }
}
