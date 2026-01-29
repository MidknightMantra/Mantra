import { addCommand } from '../lib/plugins.js';
import axios from 'axios';

addCommand({
    pattern: 'insta',
    alias: ['ig', 'igdl'],
    category: 'download',
    handler: async (m, { conn, text }) => {
        if (!text || !text.includes('instagram.com')) {
            return m.reply(`${global.emojis.warning} *Please provide a valid Instagram URL.*`);
        }

        try {
            // 1. Initial Reaction
            await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });

            // 2. Fetch Media Data
            const { data } = await axios.get(`https://api.guruapi.tech/insta/v1/igdl?url=${encodeURIComponent(text)}`);

            if (!data.media || data.media.length === 0) {
                throw new Error('No media found');
            }

            // 3. Process and Send Media
            for (let item of data.media) {
                const isVideo = item.type === 'video' || item.url.includes('.mp4');
                const mediaType = isVideo ? 'video' : 'image';

                await conn.sendMessage(m.chat, {
                    [mediaType]: { url: item.url },
                    caption: `✨ *Instagram ${mediaType === 'video' ? 'Video' : 'Image'}*`
                }, { quoted: m });
            }

            // 4. Success Reaction
            await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

        } catch (e) {
            console.error('IGDL Error:', e);
            await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
            m.reply(`${global.emojis.error} ⏤ Extraction failed. The post might be private or the link is invalid.`);
        }
    }
});