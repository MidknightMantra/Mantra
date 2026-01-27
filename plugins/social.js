import axios from 'axios'

export default {
    cmd: 'social',
    run: async (conn, m, args, text) => {
        try {
            if (!text) return m.reply('❌ Please provide a link (TikTok, IG, FB, Twitter).')

            // React (Processing)
            await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

            // ============================================================
            //                STRATEGY 1: INSTAGRAM (Snapinsta Style)
            // ============================================================
            if (text.includes('instagram.com')) {
                // API 1: Gifted (Snapinsta Clone)
                try {
                    const { data } = await axios.get(`https://api.giftedtech.my.id/api/download/instagram?url=${text}&apikey=gifted`)
                    if (data.success || data.result) {
                        const results = Array.isArray(data.result) ? data.result : [data.result]
                        
                        for (let media of results) {
                            const url = media.url || media.download_url
                            const type = media.type === 'video' || url.includes('.mp4') ? 'video' : 'image'
                            
                            await conn.sendMessage(m.chat, { 
                                [type]: { url: url }, 
                                caption: '📸 *Mantra IG*' 
                            }, { quoted: m })
                        }
                        return await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
                    }
                } catch (e) { console.log('IG API 1 Failed, trying fallback...') }

                // API 2: Fallback (A different scraper)
                try {
                    const { data } = await axios.get(`https://api.vreden.web.id/api/instagram?url=${text}`)
                    if (data.result) {
                        for (let url of data.result) {
                             const type = url.includes('.mp4') ? 'video' : 'image'
                             await conn.sendMessage(m.chat, { 
                                [type]: { url: url }, 
                                caption: '📸 *Mantra IG (Backup)*' 
                            }, { quoted: m })
                        }
                        return await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
                    }
                } catch (e) { return m.reply('❌ All Instagram servers are busy.') }
            }

            // ============================================================
            //                STRATEGY 2: TIKTOK (No Watermark)
            // ============================================================
            else if (text.includes('tiktok.com')) {
                // API 1
                try {
                    const { data } = await axios.get(`https://api.giftedtech.my.id/api/download/tiktokdl?url=${text}&apikey=gifted`)
                    const url = data.result?.url || data.result?.video
                    if (url) {
                        await conn.sendMessage(m.chat, { video: { url: url }, caption: '🎵 *Mantra TikTok*' }, { quoted: m })
                        return await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
                    }
                } catch (e) { console.log('TikTok API 1 Failed...') }

                // API 2 (Fallback)
                try {
                    const { data } = await axios.get(`https://tikwm.com/api/?url=${text}`)
                    if (data.data?.play) {
                        await conn.sendMessage(m.chat, { video: { url: data.data.play }, caption: '🎵 *Mantra TikTok (Backup)*' }, { quoted: m })
                        return await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
                    }
                } catch (e) { return m.reply('❌ TikTok download failed.') }
            }

            // ============================================================
            //                STRATEGY 3: FACEBOOK & TWITTER
            // ============================================================
            else if (text.includes('facebook.com') || text.includes('fb.watch') || text.includes('x.com') || text.includes('twitter.com')) {
                // Helper to normalize FB/Twitter URLs
                const type = text.includes('fb') ? 'facebook' : 'twitter'
                
                // API 1
                try {
                    const { data } = await axios.get(`https://api.giftedtech.my.id/api/download/${type}?url=${text}&apikey=gifted`)
                    const url = data.result?.url || data.result?.video || data.result?.hd || data.result?.sd
                    if (url) {
                        await conn.sendMessage(m.chat, { video: { url: url }, caption: `⚡ *Mantra ${type === 'facebook' ? 'FB' : 'X'}*` }, { quoted: m })
                        return await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
                    }
                } catch (e) { 
                    // API 2 (Fallback for FB/Twitter is hard to find free, but we try a generic one)
                    return m.reply(`❌ Failed to download ${type === 'facebook' ? 'Facebook' : 'Twitter'} video.`) 
                }
            }

            else {
                m.reply('❌ Link not supported.')
            }

        } catch (e) {
            console.error(e)
            m.reply('❌ System Error.')
        }
    }
}
