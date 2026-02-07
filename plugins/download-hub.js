import { addCommand } from '../lib/plugins.js';
import { UI } from '../src/utils/design.js';
import pkg from 'gifted-btns';
const { sendInteractiveMessage } = pkg;
import { log } from '../src/utils/logger.js';

// Media downloader hub
addCommand({
    pattern: 'download',
    alias: ['dl', 'media'],
    desc: 'Interactive media download menu',
    handler: async (m, { conn }) => {
        await sendInteractiveMessage(conn, m.chat, {
            title: '🎬 Media Downloader',
            text: '*Download media from various platforms*\n\n' +
                'Select a platform below or use these commands:\n\n' +
                '• `.play <song>` - YouTube audio\n' +
                '• `.ytvideo <link>` - YouTube video\n' +
                '• `.tiktok <link>` - TikTok video\n' +
                '• `.insta <link>` - Instagram media',
            footer: 'Choose your platform',
            interactiveButtons: [
                {
                    name: 'single_select',
                    buttonParamsJson: JSON.stringify({
                        title: '📥 Download Options',
                        sections: [
                            {
                                title: 'Popular Platforms',
                                rows: [
                                    { id: 'dl_youtube', title: 'YouTube', description: 'Music & Videos', header: '▶️' },
                                    { id: 'dl_tiktok', title: 'TikTok', description: 'Download TikTok videos', header: '🎵' },
                                    { id: 'dl_instagram', title: 'Instagram', description: 'Photos & Videos', header: '📸' }
                                ]
                            },
                            {
                                title: 'Tools',
                                rows: [
                                    { id: 'dl_ytsearch', title: 'Search YouTube', description: 'Find music/videos', header: '🔍' },
                                    { id: 'dl_sticker', title: 'Make Sticker', description: 'Create stickers', header: '🎨' }
                                ]
                            }
                        ]
                    })
                }
            ]
        });
    }
});

// Download option handlers
addCommand({
    pattern: 'dl_youtube',
    handler: async (m, { conn }) => {
        const guide = '▶️ *YouTube Downloader*\n\n' +
            '*Audio:* `.play <song name>`\n' +
            'Example: `.play Faded Alan Walker`\n\n' +
            '*Video:* `.ytvideo <youtube link>`\n' +
            'Example: `.ytvideo https://youtube.com/watch?v=...`';
        await m.reply(guide);
    }
});

addCommand({
    pattern: 'dl_tiktok',
    handler: async (m, { conn }) => {
        const guide = '🎵 *TikTok Downloader*\n\n' +
            '*Usage:* `.tiktok <tiktok link>`\n\n' +
            'Example: `.tiktok https://vm.tiktok.com/...`\n\n' +
            '💡 Just paste any TikTok video link!';
        await m.reply(guide);
    }
});

addCommand({
    pattern: 'dl_instagram',
    handler: async (m, { conn }) => {
        const guide = '📸 *Instagram Downloader*\n\n' +
            '*Usage:* `.insta <instagram link>`\n\n' +
            'Example: `.insta https://instagram.com/p/...`\n\n' +
            '💡 Works with posts, reels, and IGTV!';
        await m.reply(guide);
    }
});

addCommand({
    pattern: 'dl_ytsearch',
    handler: async (m, { conn }) => {
        const guide = '🔍 *YouTube Search*\n\n' +
            '*Usage:* `.yts <search query>`\n\n' +
            'Example: `.yts Faded Alan Walker`\n\n' +
            '💡 Get search results with links!';
        await m.reply(guide);
    }
});

addCommand({
    pattern: 'dl_sticker',
    handler: async (m, { conn }) => {
        const guide = '🎨 *Sticker Maker*\n\n' +
            '1. Reply to an image with `.sticker`\n' +
            '2. Send `.sticker` with an image caption\n\n' +
            '💡 Works with photos and videos!';
        await m.reply(guide);
    }
});
