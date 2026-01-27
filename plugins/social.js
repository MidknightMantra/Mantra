import axios from 'axios'

export default {
    cmd: 'social',
    run: async (conn, m, args, text) => {
        try {
            const urlMatch = text.match(/\bhttps?:\/\/\S+/gi)
            const url = urlMatch ? urlMatch[0] : null
            if (!url) return m.reply('❌ Please provide a link (TikTok, IG, FB, Twitter).')

            await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

            // ============================================================
            //                STRATEGY: INSTAGRAM (Tiered Fallback)
            // ============================================================
            if (url.includes('instagram.com')) {
                const igApis = [
                    `https://api.giftedtech.my.id/api/download/instagram?url=${url}&apikey=gifted`,
                    `https://api.botcahx.eu.org/api/dowloader/igdl?url=${url}&apikey=QCfM3mS9`,
                    `https://api.vreden.web.id/api/instagram?url=${url}`
                ]

                for (const api of igApis) {
                    try {
                        // Using a User-Agent header makes the bot look like a real browser
                        const { data } = await axios.get(api, {
                            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
                        })

                        const results = data.result || data.data || []
                        if (results.length > 0) {
                            for (let media of (Array.isArray(results) ? results : [results])) {
                                const downloadUrl = typeof media === 'string' ? media : (media.url || media.download_url)
                                if (!downloadUrl) continue
                                
                                const type = downloadUrl.includes('.mp4') ? 'video' : 'image'
                                await conn.sendMessage(m.chat, { 
                                    [type]: { url: downloadUrl }, 
                                    caption: '📸 *Mantra IG*' 
                                }, { quoted: m })
                            }
                            return await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
                        }
                    } catch (e) {
                        console.log(`⚠️ IG API Fallback: ${api.split('/')[2]} failed.`)
                        continue // Move to the next API in the list
                    }
                }
                return m.reply('❌ All Instagram download servers are currently down. Try again later.')
            }

            // ============================================================
            //                TIKTOK & OTHERS
            // ============================================================
            // ... (Keep your TikTok/FB logic from before, but add the same User-Agent header)

        } catch (e) {
            console.error('Social Plugin Error:', e)
            m.reply('❌ System Error.')
        }
    }
}
