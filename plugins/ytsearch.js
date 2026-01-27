import yts from 'yt-search'

export default {
    cmd: ['play', 'yt', 'search'],
    run: async (conn, m, { text }) => {
        if (!text) return m.reply('🎵 What do you want to hear?\nExample: *.play Blinding Lights*')
        
        const search = await yts(text)
        const video = search.videos[0]
        if (!video) return m.reply('❌ No results found.')

        const txt = `🎬 *YouTube Search*\n\n📌 *Title:* ${video.title}\n🕒 *Duration:* ${video.timestamp}\n🔗 *Link:* ${video.url}\n\n*Mantra Assistant*`
        
        await conn.sendMessage(m.chat, { 
            image: { url: video.thumbnail }, 
            caption: txt 
        }, { quoted: m })
    }
}
