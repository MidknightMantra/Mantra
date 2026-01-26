module.exports = {
    cmd: ['ping', 'speed', 'p'], // Aliases
    desc: 'Checks bot latency',
    run: async ({ sock, m, text }) => {
        const start = Date.now();
        
        // Send a message
        await sock.sendMessage(m.key.remoteJid, { text: 'Pong!' }, { quoted: m });
        
        const end = Date.now();
        console.log(`Latency: ${end - start}ms`);
    }
};
