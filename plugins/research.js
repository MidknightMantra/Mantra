import axios from 'axios'

export default {
    cmd: ['google', 'search', 'g'],
    run: async (conn, m, { text }) => {
        if (!text) return m.reply('🔍 What do you want to search for?')
        
        await conn.sendMessage(m.chat, { react: { text: '🌐', key: m.key } })
        
        try {
            const { data } = await axios.get(`https://api.vreden.web.id/api/search/google?query=${encodeURIComponent(text)}`)
            const results = data.result.map((v, i) => `*${i + 1}. ${v.title}*\n🔗 ${v.link}\n📝 ${v.description}`).join('\n\n')
            
            await m.reply(`🌍 *Google Search: ${text}*\n\n${results}`)
        } catch (e) {
            m.reply('❌ Google is currently unreachable.')
        }
    }
}
