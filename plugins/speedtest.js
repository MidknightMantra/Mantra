import { addCommand } from '../lib/plugins.js';
import { UI } from '../src/utils/design.js';
import { log } from '../src/utils/logger.js';
import speedTest from 'speedtest-net';

addCommand({
    pattern: 'speedtest',
    alias: ['speed', 'netspeed', 'pingtest'],
    category: 'tools',
    handler: async (m, { conn }) => {
        try {
            // 1. Initial reaction - this will take a while
            await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });

            const startMsg = `🌐 *MANTRA SPEED TEST*\n${global.divider}\n\n⚗️ Running speed test...\n_This may take 30-60 seconds_\n\n📊 Testing:\n• Download Speed\n• Upload Speed\n• Ping Latency\n• Server Location`;

            await m.reply(startMsg);

            log.command('speedtest', m.sender, { action: 'started' });

            // 2. Run the speed test
            const test = await speedTest({ acceptLicense: true, acceptGdpr: true });

            // 3. Extract results
            const downloadSpeed = (test.download.bandwidth / 125000).toFixed(2); // Convert to Mbps
            const uploadSpeed = (test.upload.bandwidth / 125000).toFixed(2); // Convert to Mbps
            const ping = test.ping.latency.toFixed(2);
            const server = test.server.name;
            const location = `${test.server.location}, ${test.server.country}`;
            const isp = test.isp;
            const resultUrl = test.result?.url || 'N/A';

            // 4. Format beautiful response
            let response = `🔮 *MANTRA SPEED TEST RESULTS* 🔮\n`;
            response += `${global.divider}\n\n`;

            response += `📥 *Download:* ${downloadSpeed} Mbps\n`;
            response += `📤 *Upload:* ${uploadSpeed} Mbps\n`;
            response += `🏓 *Ping:* ${ping} ms\n\n`;

            response += `🌍 *Server:* ${server}\n`;
            response += `📍 *Location:* ${location}\n`;
            response += `🌐 *ISP:* ${isp}\n\n`;

            response += `${global.divider}\n`;

            // Add speed rating
            const downloadNum = parseFloat(downloadSpeed);
            let rating = '';
            if (downloadNum >= 100) {
                rating = '⚡ *Rating:* Blazing Fast!';
            } else if (downloadNum >= 50) {
                rating = '🚀 *Rating:* Very Fast';
            } else if (downloadNum >= 25) {
                rating = '✅ *Rating:* Good';
            } else if (downloadNum >= 10) {
                rating = '⚠️ *Rating:* Average';
            } else {
                rating = '🐌 *Rating:* Slow';
            }
            response += rating;

            if (resultUrl !== 'N/A') {
                response += `\n\n🔗 *Result URL:* ${resultUrl}`;
            }

            // 5. Send results
            await conn.sendMessage(m.chat, { text: response }, { quoted: m });

            // 6. Success reaction
            await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

            log.perf('speedtest', {
                download: downloadSpeed,
                upload: uploadSpeed,
                ping: ping,
                user: m.sender
            });

        } catch (e) {
            log.error('Speed test failed', e, { command: 'speedtest', user: m.sender });
            await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });

            m.reply(UI.error(
                'Speed Test Failed',
                e.message || 'Unable to complete speed test',
                'Check internet connection\\nServer may be busy\\nTry again in a moment\\nEnsure speedtest-net is installed: npm install speedtest-net'
            ));
        }
    }
});
