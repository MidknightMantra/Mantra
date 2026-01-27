// plugins/ai.js
import axios from 'axios'

export default {
    cmd: ['ai', 'ask', 'gpt', 'gemini'],
    run: async (conn, m, { text }) => {
        if (!text) return m.reply('🤖 How can I help you today?')
        
        await conn.sendMessage(m.chat, { react: { text: '🧠', key: m.key } })
        
        try {
            // Using a public free-tier AI bridge
            const { data } = await axios.get(`https://api.vreden.web.id/api/ai/gemini?text=${encodeURIComponent(text)}`)
            await m.reply(data.result)
        } catch (e) {
            m.reply('❌ The AI is currently resting. Try again later.')
        }
    }
}
