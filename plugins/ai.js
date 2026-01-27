import axios from 'axios'

// Global object to store memory (Resets when bot restarts)
// For permanent memory, you'd use a database like MongoDB
global.aiMemory = global.aiMemory || {}

export default {
    cmd: ['ai', 'ask', 'gpt', 'gemini'],
    run: async (conn, m, { text }) => {
        if (!text) return m.reply('🤖 How can I help you today?')
        
        const userId = m.sender
        await conn.sendMessage(m.chat, { react: { text: '🧠', key: m.key } })

        // 1. Initialize memory for new users
        if (!global.aiMemory[userId]) {
            global.aiMemory[userId] = []
        }

        // 2. Create the Context-Aware Prompt
        // We join the last few messages to give the AI "Memory"
        const history = global.aiMemory[userId].join('\n')
        const fullPrompt = `History:\n${history}\nUser: ${text}\nAI:`

        try {
            // 3. Call the API
            const { data } = await axios.get(`https://api.vreden.web.id/api/ai/gemini?text=${encodeURIComponent(fullPrompt)}`)
            const response = data.result

            // 4. Update Memory (Keep only last 10 exchanges to save space/tokens)
            global.aiMemory[userId].push(`User: ${text}`)
            global.aiMemory[userId].push(`AI: ${response}`)
            
            if (global.aiMemory[userId].length > 20) { // 10 exchanges = 20 entries
                global.aiMemory[userId] = global.aiMemory[userId].slice(-20)
            }

            await m.reply(response)
        } catch (e) {
            console.error('AI Error:', e)
            m.reply('❌ The AI is currently overwhelmed. Please try again in a moment.')
        }
    }
}
