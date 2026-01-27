import axios from 'axios'
import { Plugin } from '../types/index.js'
import { config } from '../config/env.js'

// Simple in-memory store for context (Note: In production, use Redis or DB)
const aiMemory: Record<string, string[]> = {}

const ai: Plugin = {
    name: 'ai',
    triggers: ['ai', 'ask', 'gpt', 'gemini'],
    category: 'tools',
    description: 'Ask the AI assistant',
    execute: async ({ conn, msg, body, sender, reply, react }) => {
        const prompt = body.split(' ').slice(1).join(' ')

        if (!prompt) {
            await reply('🤖 How can I help you today?')
            return
        }

        await react('🧠')

        // Initialize memory
        if (!aiMemory[sender]) {
            aiMemory[sender] = []
        }

        // Build context
        const history = aiMemory[sender].join('\n')
        const fullPrompt = `History:\n${history}\nUser: ${prompt}\nAI:`

        try {
            const { data } = await axios.get(`https://api.vreden.web.id/api/ai/gemini?text=${encodeURIComponent(fullPrompt)}`)
            const response = data.result

            // Update memory (last 20 turns)
            aiMemory[sender].push(`User: ${prompt}`)
            aiMemory[sender].push(`AI: ${response}`)

            if (aiMemory[sender].length > 20) {
                aiMemory[sender] = aiMemory[sender].slice(-20)
            }

            await reply(response)
        } catch (e) {
            await reply('❌ The AI is currently overwhelmed or the API is down.')
        }
    }
}

export default ai
