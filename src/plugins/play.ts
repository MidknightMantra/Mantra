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

            const api = `https://api.vreden.web.id/api/download/ytmp${isVideo ? '4' : '3'}?url=${video.url}`
            const { data } = await axios.get(api)
            const dlUrl = data.result?.download?.url || data.result?.url

            if (!dlUrl) {
                await reply('❌ *Error:* Failed to fetch download link. API might be limited.')
                return
            }

            await react('⬇️')
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
            await reply('❌ *API Error:* Could not fetch the media. The download service might be down.')
        }
    }
}

export default play
