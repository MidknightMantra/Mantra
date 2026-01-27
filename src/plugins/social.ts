import axios from 'axios'
import { Plugin } from '../types/index.js'

const social: Plugin = {
    name: 'social',
    triggers: ['social', 'dl', 'ig', 'fb', 'tt', 'tw'],
    category: 'media',
    description: 'Download media from Instagram, TikTok, Facebook, Twitter, etc.',
    execute: async ({ conn, msg, body, args, reply, react, command }) => {
        let url = args[0]

        // If quoted message has text/link
        if (!url && msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation) {
            url = msg.message.extendedTextMessage.contextInfo.quotedMessage.conversation
        }

        if (!url) {
            await reply(`🔗 Please provide a URL!\nExample: *.${command} https://www.instagram.com/p/xyz*`)
            return
        }

        await react('🔍')

        try {
            let apiEndpoint = ''

            // 1. Detect Platform & specific endpoint
            if (url.includes('instagram.com')) {
                if (url.includes('/stories/')) {
                    // Need username or handling for story link? User provided 'instastories?q=' which implies search
                    // But for link 'instagramdl' is safer
                    apiEndpoint = `https://apiskeith.vercel.app/download/instagramdl?url=${url}`
                } else {
                    apiEndpoint = `https://apiskeith.vercel.app/download/instagramdl?url=${url}`
                }
            } else if (url.includes('tiktok.com')) {
                apiEndpoint = `https://apiskeith.vercel.app/download/tiktokdl?url=${url}`
            } else if (url.includes('facebook.com') || url.includes('fb.watch')) {
                apiEndpoint = `https://apiskeith.vercel.app/download/fbdl?url=${url}`
            } else if (url.includes('twitter.com') || url.includes('x.com')) {
                apiEndpoint = `https://apiskeith.vercel.app/download/twitter?url=${url}`
            } else {
                // Fallback to all-downloader
                apiEndpoint = `https://apiskeith.vercel.app/download/alldl?url=${url}`
            }

            // 2. Call API
            const { data } = await axios.get(apiEndpoint)

            // 3. Parse Result (structure varies by endpoint usually, but we try common fields)
            // Most Vreden/Keith APIs return { status: true, result: { url: '...' } } or similar
            let mediaUrl = data.url || data.result?.url || data.result?.download?.url || data.result

            if (!mediaUrl || typeof mediaUrl !== 'string') {
                // Try secondary common fields
                if (data.result?.video) mediaUrl = data.result.video
                else if (data.result?.image) mediaUrl = data.result.image
            }

            if (!mediaUrl) {
                // Try to find any URL in the object values if it's flat
                const values = Object.values(data)
                // @ts-ignore
                const potentialUrl = values.find(v => typeof v === 'string' && v.startsWith('http'))
                if (potentialUrl) mediaUrl = potentialUrl as string
            }

            if (!mediaUrl) {
                await reply('❌ Could not find media in the link. The API might be unsupported.')
                // console.log('Debug Social:', data)
                return
            }

            await react('⬇️')

            // 4. Send Media
            const extension = mediaUrl.split('.').pop()?.split('?')[0] || ''
            const isVideo = ['mp4', 'mov', 'avi'].includes(extension) || mediaUrl.includes('.mp4')

            if (isVideo) {
                await conn.sendMessage(msg.key.remoteJid!, { video: { url: mediaUrl }, caption: '✅ Downloaded via Mantra' }, { quoted: msg })
            } else {
                await conn.sendMessage(msg.key.remoteJid!, { image: { url: mediaUrl }, caption: '✅ Downloaded via Mantra' }, { quoted: msg })
            }

            await react('✅')

        } catch (e) {
            // logger.error(e)
            await reply('❌ API Error: ' + (e as Error).message)
        }
    }
}

export default social
