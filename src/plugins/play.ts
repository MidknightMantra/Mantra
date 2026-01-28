import yts from 'yt-search'
import axios from 'axios'
import { Plugin } from '../types/index.js'
import { logger } from '../utils/logger.js'

const play: Plugin = {
    name: 'play',
    triggers: ['play', 'song', 'video', 'yt'],
    category: 'media',
    description: 'Play music or video from YouTube',
    execute: async ({ conn, msg, body, args, reply, react, command }) => {
        if (!args.length) {
            await reply(`🎵 Please provide a song name.\nExample: *.play Blinding Lights*`)
            return
        }

        await react('🔍')
        const query = args.join(' ')

        try {
            const search = await yts(query)
            const video = search.videos[0]
            if (!video) {
                await reply('❌ *No results found.*')
                return
            }

            const isVideo = command === 'video'
            const infoText = `
🎬 *MANTRA PLAYER*

📌 *Title:* ${video.title}
🕒 *Duration:* ${video.timestamp}
👀 *Views:* ${video.views}
👤 *Channel:* ${video.author.name}
🔗 *Link:* ${video.url}

*Sending your ${isVideo ? 'video' : 'audio'}...*`.trim()

            await conn.sendMessage(msg.key.remoteJid!, { image: { url: video.thumbnail || '' }, caption: infoText }, { quoted: msg })

            await react('⬇️')

            let api = `https://api.vreden.web.id/api/download/ytmp${isVideo ? '4' : '3'}?url=${video.url}`
            let { data } = await axios.get(api)
            let dlUrl = data.result?.download?.url || data.result?.url

            // Fallback to GiftedTech if Vreden fails
            if (!dlUrl) {
                logger.warn({ url: video.url }, 'Vreden YT API failed, trying GiftedTech...')
                const giftedApi = `https://api.giftedtech.co.ke/api/download/ytmp${isVideo ? '4' : '3'}?apikey=gifted&url=${video.url}`
                const fallback = await axios.get(giftedApi)
                dlUrl = fallback.data.result?.download_url || fallback.data.result?.url
            }

            if (!dlUrl) {
                await reply('❌ *Error:* Failed to fetch download link from all servers. The video might be age-restricted or too long.')
                return
            }

            if (isVideo) {
                await conn.sendMessage(msg.key.remoteJid!, {
                    video: { url: dlUrl },
                    caption: `✅ *${video.title}*`
                }, { quoted: msg })
            } else {
                await conn.sendMessage(msg.key.remoteJid!, {
                    audio: { url: dlUrl },
                    mimetype: 'audio/mp4',
                    fileName: `${video.title}.mp3`
                }, { quoted: msg })
            }

            await react('✅')

        } catch (e) {
            logger.error({ err: e }, 'YT Play Error')
            await reply('❌ *API Error:* Could not fetch the media. The download service might be down.')
        }
    }
}

export default play
