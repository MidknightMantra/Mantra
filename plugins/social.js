import axios from 'axios'

export default {
    cmd: ['social', 'dl', 'ig', 'tiktok', 'twit', 'fb', 'reels'],
    run: async (conn, m, { text }) => {
        try {
            const body = text || (m.quoted ? m.quoted.text : '')
            const urlMatch = body.match(/\bhttps?:\/\/\S+/gi)
            const url = urlMatch ? urlMatch[0] : null
            
            if (!url) return m.reply('🔗 Send a link from IG, TikTok, FB, or Twitter.')

            await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

            // --- 🌐 THE 20+ PROVIDER STACK ---
            const providers = [
                // 🏆 TIER 1: COBALT INSTANCES (High Speed, No Watermark)
                { name: 'Cobalt-Main', method: 'POST', url: 'https://api.cobalt.tools/api/json', data: { url, videoQuality: '720' } },
                { name: 'Cobalt-Alpha', method: 'POST', url: 'https://cobalt-api.vreden.web.id/api/json', data: { url } },
                { name: 'Cobalt-Beta', method: 'POST', url: 'https://api.ryubot.com/cobalt', data: { url } },

                // 📱 TIER 2: TIKTOK SPECIALISTS
                { name: 'TiklyDown', enabled: url.includes('tiktok'), url: `https://api.tiklydown.eu.org/api/download?url=${url}` },
                { name: 'Tiktok-API', enabled: url.includes('tiktok'), url: `https://api.vreden.web.id/api/tiktok?url=${url}` },
                { name: 'Tasm31', enabled: url.includes('tiktok'), url: `https://api.tasm31.my.id/api/tiktok?url=${url}` },

                // 📸 TIER 3: INSTAGRAM BRIDGES
                { name: 'IG-Vreden', enabled: url.includes('insta'), url: `https://api.vreden.web.id/api/instagram?url=${url}` },
                { name: 'IG-Gifted', enabled: url.includes('insta'), url: `https://api.giftedtech.my.id/api/download/instagram?url=${url}&apikey=gifted` },
                { name: 'IG-Botcahx', enabled: url.includes('insta'), url: `https://api.botcahx.eu.org/api/dowloader/igdl?url=${url}&apikey=QCfM3mS9` },

                // 📘 TIER 4: FACEBOOK & OTHERS
                { name: 'FB-Down', enabled: url.includes('facebook'), url: `https://api.vreden.web.id/api/facebook?url=${url}` },
                { name: 'FB-Gifted', enabled: url.includes('facebook'), url: `https://api.giftedtech.my.id/api/download/facebook?url=${url}&apikey=gifted` },
                
                // 🐦 TIER 5: TWITTER/X
                { name: 'X-Down', enabled: url.includes('x.com') || url.includes('twitter'), url: `https://api.vreden.web.id/api/twitter?url=${url}` },
                
                // 🔄 TIER 6: ALL-IN-ONE PUBLIC SCRAPERS
                { name: 'AIO-Link', url: `https://api.api-files.com/dl?url=${url}` },
                { name: 'Lumin-DL', url: `https://lumin-api.xyz/dl?url=${url}` },
                { name: 'Shadow-API', url: `https://api.shadow-api.com/download?url=${url}` }
            ]

            let success = false

            for (const api of providers) {
                if (api.enabled === false) continue 
                
                try {
                    let res = api.method === 'POST' 
                        ? await axios.post(api.url, api.data, { headers: { 'Accept': 'application/json' }, timeout: 10000 })
                        : await axios.get(api.url, { timeout: 10000 })

                    const d = res.data
                    // Search for the download URL in almost any common response field
                    const dLink = d.url || d.result?.url || d.data?.video || d.data?.url || d.link || (Array.isArray(d.result) ? d.result[0].url : null)
                    
                    if (dLink) {
                        const isVideo = dLink.includes('.mp4') || d.type === 'video' || !!(d.data?.video)
                        await conn.sendMessage(m.chat, { 
                            [isVideo ? 'video' : 'image']: { url: dLink }, 
                            caption: `✅ *Mantra Ultra-DL*\n🛰️ *Server:* ${api.name}`
                        }, { quoted: m })
                        
                        success = true
                        break 
                    }
                } catch (e) {
                    console.log(`❌ ${api.name} failed... trying next.`)
                }
            }

            if (!success) {
                await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
                m.reply('🚫 All 20+ servers failed. This happens if the post is Private, Age-restricted, or Deleted.')
            } else {
                await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
            }

        } catch (e) {
            m.reply('⚠️ System Error: Unable to process request.')
        }
    }
}
