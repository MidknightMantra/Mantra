import axios from 'axios'

export default {
    cmd: 'social',
    run: async (conn, m, { text, args }) => {
        try {
            // 1. Better URL Extraction
            const body = text || (m.quoted ? m.quoted.text : '')
            const urlMatch = body.match(/\bhttps?:\/\/\S+/gi)
            const url = urlMatch ? urlMatch[0] : null
            
            if (!url) return m.reply('❌ Please provide a link or quote a post.\nExample: *.social https://vm.tiktok.com/xxx*')

            await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

            // 2. Organized API List (Add more here as you find them)
            const apis = [
                { name: 'Vreden', url: `https://api.vreden.web.id/api/instagram?url=${url}` },
                { name: 'Gifted', url: `https://api.giftedtech.my.id/api/download/instagram?url=${url}&apikey=gifted` },
                { name: 'Botcahx', url: `https://api.botcahx.eu.org/api/dowloader/igdl?url=${url}&apikey=QCfM3mS9` }
            ]

            let success = false

            for (const api of apis) {
                try {
                    const { data } = await axios.get(api.url, {
                        timeout: 10000, // Don't wait forever
                        headers: { 'User-Agent': 'Mozilla/5.0' }
                    })

                    // Handle different API response formats
                    const result = data.result || data.data || data.urls
                    if (!result) continue

                    const mediaArray = Array.isArray(result) ? result : [result]
                    
                    for (const item of mediaArray) {
                        const downloadUrl = typeof item === 'string' ? item : (item.url || item.download_url || item.url_download)
                        if (!downloadUrl) continue

                        const isVideo = downloadUrl.includes('.mp4') || (item.type === 'video')
                        
                        await conn.sendMessage(m.chat, { 
                            [isVideo ? 'video' : 'image']: { url: downloadUrl }, 
                            caption: `✅ *Source:* ${api.name}`,
                        }, { quoted: m })
                        success = true
                    }

                    if (success) break // Stop trying other APIs if one worked
                } catch (e) {
                    console.log(`⚠️ API ${api.name} failed:`, e.message)
                    continue // Try the next API
                }
            }

            if (success) {
                await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
            } else {
                await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
                m.reply('❌ All download servers are currently unreachable. Please try another link or wait.')
            }

        } catch (e) {
            console.error('Core Social Plugin Error:', e)
            m.reply('❌ System Error: Check your Railway logs for details.')
        }
    }
}
