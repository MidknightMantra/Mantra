import axios from 'axios'

export default {
    cmd: 'social',
    run: async (conn, m, { text, args }) => {
        try {
            const body = text || (m.quoted ? m.quoted.text : '')
            const urlMatch = body.match(/\bhttps?:\/\/\S+/gi)
            const url = urlMatch ? urlMatch[0] : null
            
            if (!url) return m.reply('❌ Please provide a link (IG, TikTok, YT).\nExample: *.social https://www.instagram.com/reels/xxx*')

            await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

            // --- 2026 Working API Stack ---
            const apis = [
                // Priority 1: High Reliability (Open Source Scrapers)
                { name: 'Cobalt', url: `https://api.cobalt.tools/api/json`, method: 'POST', data: { url: url, videoQuality: '720' } },
                // Priority 2: Public Multi-Downloader
                { name: 'AIO-DL', url: `https://api.vreden.web.id/api/download/social?url=${url}` },
                // Priority 3: Specific Fallback
                { name: 'Lumin', url: `https://lumin-api.xyz/dl?url=${url}` }
            ]

            let success = false

            for (const api of apis) {
                try {
                    let response;
                    if (api.method === 'POST') {
                        response = await axios.post(api.url, api.data, { 
                            headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
                            timeout: 15000 
                        })
                    } else {
                        response = await axios.get(api.url, { timeout: 15000 })
                    }

                    const res = response.data
                    // Handle Cobalt structure or standard result structure
                    const downloadUrl = res.url || res.result?.url || res.data?.download_url || res.link
                    
                    if (downloadUrl) {
                        const type = (downloadUrl.includes('.mp4') || res.type === 'video') ? 'video' : 'image'
                        
                        await conn.sendMessage(m.chat, { 
                            [type]: { url: downloadUrl }, 
                            caption: `✅ *Mantra Downloader*\n🛰️ *Server:* ${api.name}`,
                        }, { quoted: m })
                        
                        success = true
                        break 
                    }
                } catch (e) {
                    console.log(`⚠️ ${api.name} failed, trying next...`)
                }
            }

            if (!success) {
                await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
                m.reply('❌ All servers failed. This usually happens if the content is Private or Region-locked.')
            } else {
                await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
            }

        } catch (e) {
            console.error('Social Plugin Error:', e)
            m.reply('❌ System Error. Check your console logs.')
        }
    }
}
