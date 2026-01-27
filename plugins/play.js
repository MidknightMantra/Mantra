import yts from 'yt-search'
import axios from 'axios'

export default {
    cmd: ['play', 'song', 'video', 'yt'],
    run: async (conn, m, { text, command }) => {
        if (!text) return m.reply(`🎵 Please provide a song name.\nExample: *.play Blinding Lights*`)

        await conn.sendMessage(m.chat, { react: { text: '🔍', key: m.key } })

        try {
            // 1. Search YouTube
            const search = await yts(text)
            const video = search.videos[0]
            if (!video) return m.reply('❌ No results found.')

            const infoText = `
🎬 *Mantra YouTube Player*

📌 *Title:* ${video.title}
🕒 *Duration:* ${video.timestamp}
👀 *Views:* ${video.views}
🔗 *Link:* ${video.url}

*Sending your ${command === 'video' ? 'video' : 'audio'}...*`.trim()

            await conn.sendMessage(m.chat, { image: { url: video.thumbnail }, caption: infoText }, { quoted: m })

            // 2. Download via Public API (No Key)
            const isVideo = command === 'video'
            const api = `https://api.vreden.web.id/api/download/ytmp${isVideo ? '4' : '3'}?url=${video.url}`
            const { data } = await axios.get(api)

            const dlUrl = data.result?.download?.url || data.result?.url
            if (!dlUrl) throw new Error('Download link not found')

            // 3. Send the file
            if (isVideo) {
                await conn.sendMessage(m.chat, { video: { url: dlUrl }, caption: video.title }, { quoted: m })
            } else {
                await conn.sendMessage(m.chat, { 
                    audio: { url: dlUrl }, 
                    mimetype: 'audio/mp4', 
                    ptt: false // Set to true if you want it to look like a voice note
                }, { quoted: m })
            }

            await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

        } catch (e) {
            console.error(e)
            m.reply('❌ Error: Could not fetch the media. Try again later.')
        }
    }
}
