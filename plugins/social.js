import axios from 'axios'

export default {
    cmd: 'social',
    run: async (conn, m, args, text) => {
        try {
            const urlMatch = text.match(/\bhttps?:\/\/\S+/gi)
            const url = urlMatch ? urlMatch[0] : null
            if (!url) return m.reply('❌ Please provide a link (TikTok, IG, FB, Twitter).')

            await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

            // ===========================================================
            // STRATEGY 1: INSTAGRAM (Snapinsta Style - Multi-Media)
            // ===========================================================
            if (url.includes('instagram.com')) {
                const igApis = [
                    `https://api.giftedtech.my.id/api/download/instagram?url=${url}&apikey=gifted`,
                    `https://api.vreden.web.id/api/instagram?url=${url}`,
                    `https://api.botcahx.eu.org/api/dowloader/igdl?url=${url}&apikey=QCfM3mS9`
                ]

                for (const api of igApis) {
                    try {
                        const { data } = await axios.get(api)
                        const results = data.result || data.data || []
                        if (results.length > 0) {
                            for (let media of results) {
                                // Handle different API response shapes (string vs object)
                                const downloadUrl = typeof media === 'string' ? media : (media.url || media.download_url || media.url_download)
                                if (!downloadUrl) continue
                                
                                const type = downloadUrl.includes('.mp4') ? 'video' : 'image'
                                await conn.sendMessage(m.chat, { 
                                    [type]: { url: downloadUrl }, 
                                    caption: '📸 *Mantra IG (Snapinsta Style)*' 
                                }, { quoted: m })
                            }
                            return await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
                        }
                    } catch (e) { continue } // Try next API if this one fails
                }
                return m.reply('❌ Instagram servers are currently unreachable.')
            }

            // ============================================================
            // STRATEGY 2: TIKTOK (No Watermark + Fallbacks)
            // ============================================================
            else if (url.includes('tiktok.com')) {
                try {
                    // Primary: GiftedTech
                    const { data: d1 } = await axios.get(`https://api.giftedtech.my.id/api/download/tiktokdl?url=${url}&apikey=gifted`)
                    const video = d1.result?.url || d1.result?.video
                    if (video) {
                        await conn.sendMessage(m.chat, { video: { url: video }, caption: '🎵 *Mantra TikTok*' }, { quoted: m })
                        return await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
                    }
                } catch (e) {
                    // Fallback: TikWM
                    try {
                        const { data: d2 } = await axios.get(`https://tikwm.com/api/?url=${url}`)
                        if (d2.data?.play) {
                            await conn.sendMessage(m.chat, { video: { url: d2.data.play }, caption: '🎵 *Mantra TikTok (Backup)*' }, { quoted: m })
                            return await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
                        }
                    } catch (e) { return m.reply('❌ TikTok servers down.') }
                }
            }

            // ============================================================
            // STRATEGY 3: FACEBOOK (HD/SD Selection)
            // ============================================================
            else if (url.includes('facebook.com') || url.includes('fb.watch')) {
                try {
                    const { data } = await axios.get(`https://api.giftedtech.my.id/api/download/facebook?url=${url}&apikey=gifted`)
                    const fbUrl = data.result?.hd || data.result?.sd || data.result?.url
                    if (fbUrl) {
                        await conn.sendMessage(m.chat, { video: { url: fbUrl }, caption: '⚡ *Mantra Facebook*' }, { quoted: m })
                        return await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
                    }
                } catch (e) { return m.reply('❌ Facebook download failed.') }
            }

            m.reply('❌ Link not supported.')
            await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })

        } catch (e) {
            console.error(e)
            m.reply('❌ System Error.')
        }
    }
}
