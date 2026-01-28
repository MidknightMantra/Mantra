import axios from 'axios'
import { Plugin } from '../types/index.js'

// Simple in-memory store for context
const aiMemory: Record<string, string[]> = {}

const ai: Plugin = {
    name: 'ai',
    triggers: ['ai', 'ask', 'gpt', 'gemini', 'gpt4o', 'gpt4o-mini', 'letmegpt', 'wwdgpt'],
    category: 'tools',
    description: 'Ask various AI models (GPT-4o, Gemini, etc.)',
    execute: async ({ conn, msg, body, sender, reply, react, command }) => {
        const prompt = body.split(' ').slice(1).join(' ')

        if (!prompt) {
            await reply(`🤖 *Mantra AI Assistant*\n\nPlease provide a query!\nExample: *.${command} What is Quantum Physics?*`)
            return
        }

        await react('🧠')

        // Initialize memory
        if (!aiMemory[sender]) {
            aiMemory[sender] = []
        }

        // Simulate typing
        await conn.sendPresenceUpdate('composing', msg.key.remoteJid!)

        // Build context with a thematic prompt
        const history = aiMemory[sender].join('\n')
        const systemPrompt = "You are Mantra AI, a helpful and witty WhatsApp assistant. Keep responses concise, friendly, and use relevant emojis."
        const fullPrompt = `${systemPrompt}\nHistory:\n${history}\nUser: ${prompt}\nAI:`

        try {
            let apiEndpoint = ''
            let modelName = 'Mantra AI'

            // Select API based on command
            switch (command) {
                case 'gpt4o':
                    apiEndpoint = `https://api.giftedtech.co.ke/api/ai/gpt4o?apikey=gifted&q=${encodeURIComponent(fullPrompt)}`
                    modelName = 'GPT-4o'
                    break
                case 'gpt4o-mini':
                    apiEndpoint = `https://api.giftedtech.co.ke/api/ai/gpt4o-mini?apikey=gifted&q=${encodeURIComponent(fullPrompt)}`
                    modelName = 'GPT-4o Mini'
                    break
                case 'letmegpt':
                    apiEndpoint = `https://api.giftedtech.co.ke/api/ai/letmegpt?apikey=gifted&q=${encodeURIComponent(fullPrompt)}`
                    modelName = 'LetMeGPT'
                    break
                case 'wwdgpt':
                    apiEndpoint = `https://api.giftedtech.co.ke/api/ai/wwdgpt?apikey=gifted&q=${encodeURIComponent(fullPrompt)}`
                    modelName = 'WWD-GPT'
                    break
                default:
                    // Default to Gemini or Gifted AI
                    apiEndpoint = `https://api.giftedtech.co.ke/api/ai/ai?apikey=gifted&q=${encodeURIComponent(fullPrompt)}`
                    modelName = 'Gemini'
            }

            const { data } = await axios.get(apiEndpoint)
            const response = data.result || data.data || (typeof data === 'string' ? data : null)

            if (!response) throw new Error('Empty AI response')

            // Stop typing simulation
            await conn.sendPresenceUpdate('paused', msg.key.remoteJid!)

            // Update memory (last 20 turns)
            aiMemory[sender].push(`User: ${prompt}`)
            aiMemory[sender].push(`AI: ${response}`)

            if (aiMemory[sender].length > 20) {
                aiMemory[sender] = aiMemory[sender].slice(-20)
            }

            await reply(`*MANTRA AI - ${modelName.toUpperCase()}* 🧠\n\n${response}`)
        } catch (e) {
            await conn.sendPresenceUpdate('paused', msg.key.remoteJid!)

            // Fallback to Gemini Vreden if GiftedTech fails
            try {
                const { data } = await axios.get(`https://api.vreden.web.id/api/ai/gemini?text=${encodeURIComponent(fullPrompt)}`)
                const response = data.result
                await reply(`*MANTRA AI - GEMINI (FALLBACK)* 🧠\n\n${response}`)
            } catch (err) {
                await reply('❌ *AI Error:* All AI models are currently unresponsive. Please try again later.')
            }
        }
    }
}

export default ai
