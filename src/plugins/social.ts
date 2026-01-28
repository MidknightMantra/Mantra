import axios from 'axios'
import { Plugin } from '../types/index.js'
import { logger } from '../utils/logger.js'

const social: Plugin = {
    name: 'social',
    triggers: ['social', 'dl', 'ig', 'fb', 'tt', 'tw', 'x', 'tiktok', 'pin', 'threads'],
    category: 'media',
    description: 'Professional media downloader for IG, TT, FB, X, PIN, etc.',
    execute: async ({ conn, msg, body, args, reply, react, command }) => {
        let url = args[0]

        // Handle quoted links
        if (!url && msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
            const quoted = msg.message.extendedTextMessage.contextInfo.quotedMessage
            url = quoted.conversation || quoted.extendedTextMessage?.text || ''
        }

        if (!url || !url.startsWith('http')) {
            await reply(`✨ *MANTRA PRO DOWNLOADER* ✨\n\n🔗 Please provide a valid link!\nExample: *.${command} https://instagram.com/p/xyz*`)
            return
        }

        await react('🔎')

        try {
            let apiEndpoint = ''
            const lowerUrl = url.toLowerCase()
            let useGifted = false

            // 1. Determine optimized API endpoint (Prioritize GiftedTech for requested platforms)
            if (lowerUrl.includes('instagram.com')) {
                apiEndpoint = `https://api.giftedtech.co.ke/api/download/instadl?apikey=gifted&url=${url}`
                useGifted = true
            } else if (lowerUrl.includes('tiktok.com')) {
                apiEndpoint = `https://api.giftedtech.co.ke/api/download/tiktokdlv4?apikey=gifted&url=${url}`
                useGifted = true
            } else if (lowerUrl.includes('twitter.com') || lowerUrl.includes('x.com')) {
                apiEndpoint = `https://api.giftedtech.co.ke/api/download/twitter?apikey=gifted&url=${url}`
                useGifted = true
            } else if (lowerUrl.includes('facebook.com') || lowerUrl.includes('fb.watch')) {
                apiEndpoint = `https://api.vreden.web.id/api/download/fbdl?url=${url}`
            } else if (lowerUrl.includes('pinterest.com') || lowerUrl.includes('pin.it')) {
                apiEndpoint = `https://api.vreden.web.id/api/download/pinterest?url=${url}`
            } else if (lowerUrl.includes('threads.net')) {
                apiEndpoint = `https://api.vreden.web.id/api/download/threads?url=${url}`
            } else {
                apiEndpoint = `https://api.vreden.web.id/api/download/alldl?url=${url}`
            }

            let { data } = await axios.get(apiEndpoint)

            // Fallback Logic if GiftedTech fails
            if (useGifted && (!data.status || !data.result)) {
                logger.warn({ url, endpoint: apiEndpoint }, 'GiftedTech API failed, trying fallback...')
                if (lowerUrl.includes('instagram.com')) {
                    apiEndpoint = `https://api.vreden.web.id/api/download/igdl?url=${url}`
                } else if (lowerUrl.includes('tiktok.com')) {
                    apiEndpoint = `https://api.vreden.web.id/api/download/tiktok?url=${url}`
                } else if (lowerUrl.includes('twitter.com') || lowerUrl.includes('x.com')) {
                    apiEndpoint = `https://api.vreden.web.id/api/download/twitter?url=${url}`
                }
                const fallback = await axios.get(apiEndpoint)
                data = fallback.data
            }

            const result = data.result

            if (!result || (!result.url && !result.video && !result.image && !Array.isArray(result))) {
                throw new Error('No media found')
            }

            await react('📥')

            // 2. Handle Metadata
            const caption = result.caption || result.title || ''
            const author = result.author || result.username || result.owner || 'Uploader'
            const stats = result.statistics ? `\n📊 *Stats:* ${result.statistics.likeCount || 0} ❤️ | ${result.statistics.commentCount || 0} 💬` : ''

            const infoHeader = `
🎬 *Mantra Pro Downloader*
👤 *Author:* ${author}
📝 *Caption:* ${caption.slice(0, 150)}${caption.length > 150 ? '...' : ''}
${stats}
`.trim()

            // 3. Discharge Media (Single or Multiple)
            const mediaList: any[] = []

            if (Array.isArray(result)) {
                // Carousel/Slideshow
                result.forEach(item => {
                    if (typeof item === 'string') mediaList.push({ url: item })
                    else if (item.url) mediaList.push(item)
                })
            } else if (result.links && Array.isArray(result.links)) {
                // Secondary structure for IG albums
                result.links.forEach((l: any) => mediaList.push({ url: l.url || l }))
            } else {
                // Single Item
                const singleUrl = result.url || result.video || result.image || result.download?.url || (typeof result === 'string' ? result : null)
                if (singleUrl) mediaList.push({ url: singleUrl, type: result.type })
            }

            if (mediaList.length === 0) throw new Error('Could not parse media list')

            // 4. Send items
            for (let i = 0; i < mediaList.length; i++) {
                const media = mediaList[i]
                const mUrl = media.url || media
                const isFirst = i === 0
                const isVideo = (mUrl.toLowerCase().includes('.mp4')) || (media.type === 'video') || (result.type === 'video')

                const messageOptions: any = {}
                if (isVideo) messageOptions.video = { url: mUrl }
                else messageOptions.image = { url: mUrl }

                if (isFirst) messageOptions.caption = infoHeader

                await conn.sendMessage(msg.key.remoteJid!, messageOptions, { quoted: msg })
            }

            await react('✅')

        } catch (err) {
            logger.error({ err }, 'Social Downloader Pro Error')
            await react('❌')
            await reply('❌ *Pro Downloader Error:* Unable to fetch media. The link might be private, region-locked, or the API is under maintenance.')
        }
    }
}

export default social
