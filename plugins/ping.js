const axios = require('axios');
const os = require('os');

module.exports = {
    name: 'ping',
    aliases: ['speed', 'latency', 'testspeed', 'response'],
    description: 'Check bot response speed and system information',

    async execute(sock, m, args) {
        const start = Date.now();
        
        // Calculate system information
        const uptime = Math.floor(process.uptime());
        const totalMemory = os.totalmem();
        const freeMemory = os.freemem();
        const usedMemory = totalMemory - freeMemory;
        const memoryUsagePercent = ((usedMemory / totalMemory) * 100).toFixed(2);
        
        // Get CPU info
        const cpuInfo = os.cpus();
        const cpuModel = cpuInfo[0].model;
        const cpuCores = cpuInfo.length;
        
        // Get platform info
        const platform = os.platform();
        const arch = os.arch();
        
        // Format uptime into human-readable format
        const formatUptime = (seconds) => {
            const days = Math.floor(seconds / (24 * 60 * 60));
            const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
            const minutes = Math.floor((seconds % (60 * 60)) / 60);
            const secs = Math.floor(seconds % 60);
            
            return `${days}d ${hours}h ${minutes}m ${secs}s`;
        };
        
        // Get WhatsApp connection status
        const connectionStatus = sock.ws?.readyState === 1 ? '🟢 Connected' : '🔴 Disconnected';
        const batteryStatus = sock?.authState?.creds?.me?.phone?.battery 
            ? `${sock.authState.creds.me.phone.battery.value}% ${sock.authState.creds.me.phone.battery.live ? '🔌 Charging' : '🔋 Not Charging'}` 
            : 'Unknown';
        
        // Calculate latency after gathering system info
        const latency = Date.now() - start;
        
        // Format the ping information
        const pingInfo = `
🏓 *Pong!*

*📡 System Status*

*Response Time:* ${latency} ms
*Connection:* ${connectionStatus}
*Battery:* ${batteryStatus}

*⏱️ Uptime:* ${formatUptime(uptime)}

*💾 Memory Usage:* 
• Used: ${(usedMemory / 1024 / 1024).toFixed(2)} MB
• Total: ${(totalMemory / 1024 / 1024).toFixed(2)} MB
• Percentage: ${memoryUsagePercent}%

*🖥️ CPU Info:*
• Cores: ${cpuCores}
• Model: ${cpuModel}
• Platform: ${platform} (${arch})

*📱 WhatsApp Info:*
• Device: ${sock?.user?.name || 'Unknown'}
• Push Name: ${m.pushName || 'Unknown'}
• User ID: ${sock?.user?.id?.split(':')[0] || 'Unknown'}

*📊 Performance Metrics:*
• Message Processing: Real-time
• Network Speed: Optimized
• Response Quality: High
        `.trim();
        
        const imgUrl = 'https://files.catbox.moe/rg0pnn.jpg';
        const author = 'MidknightMantra';
        const botname = 'MANTRA';
        const sourceUrl = 'https://abztech.my.id/';

        try {
            const thumbnailBuffer = (await axios.get(imgUrl, { responseType: 'arraybuffer' })).data;

            await m.send(pingInfo, {
                contextInfo: {
                    forwardingScore: 999,
                    isForwarded: true,
                    externalAdReply: {
                        title: `🏓 Pong! - ${latency}ms`,
                        body: `System Status: Online | Uptime: ${formatUptime(uptime)}`,
                        thumbnail: thumbnailBuffer,
                        mediaType: 1,
                        renderLargerThumbnail: true,
                        sourceUrl
                    }
                }
            });
        } catch (err) {
            console.error('Error sending ping info:', err);
            // Fallback to simple reply if external ad reply fails
            await m.reply(`🏓 Pong!\nLatency: ${latency} ms\nUptime: ${formatUptime(uptime)}`);
        }
    }
};
