import yts from 'yt-search'
import axios from 'axios'
import { Plugin } from '../types/index.js'

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
            // 1. Search YouTube
            const search = await yts(query)
            const video = search.videos[0]
            if (!video) {
                await reply('❌ No results found.')
                return
            }

            const infoText = `
🎬 *Mantra YouTube Player*

📌 *Title:* ${video.title}
🕒 *Duration:* ${video.timestamp}
👀 *Views:* ${video.views}
🔗 *Link:* ${video.url}

*Sending your ${command === 'video' ? 'video' : 'audio'}...*`.trim()

            await conn.sendMessage(msg.key.remoteJid!, { image: { url: video.thumbnail }, caption: infoText }, { quoted: msg })

            // 2. Download via Public API (Using the same logic as legacy)
            // Note: Public APIs are unstable. Consider using a library like ytdl-core in production if available,
            // or a reliable external service.
            const isVideo = command === 'video'
            const api = `https://api.vreden.web.id/api/download/ytmp${isVideo ? '4' : '3'}?url=${video.url}`

            const { data } = await axios.get(api)
            const dlUrl = data.result?.download?.url || data.result?.url

            if (!dlUrl) {
                await reply('❌ Failed to fetch download link from API.')
                return
            }

            // 3. Send the file
            await react('⬇️')
            if (isVideo) {
                await conn.sendMessage(msg.key.remoteJid!, { video: { url: dlUrl }, caption: video.title }, { quoted: msg })
            } else {
                await conn.sendMessage(msg.key.remoteJid!, {
                    audio: { url: dlUrl },
                    mimetype: 'audio/mp4',
                    // ptt: false // Voice note format
                }, { quoted: msg })
            }

            await react('✅')

        } catch (e) {
            // console.error(e)
            await reply('❌ Error: Could not fetch the media. The API might be down.')
        }
    }
}

export default play
