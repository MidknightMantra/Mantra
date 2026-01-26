module.exports = {
    cmd: ['ping', 'speed'], // Commands that trigger this
    run: async (conn, m, { args }) => {
        const start = Date.now();
        await conn.sendMessage(m.chat, { text: 'Pong!' }, { quoted: m });
        const end = Date.now();
        await conn.sendMessage(m.chat, { text: `Latency: ${end - start}ms` });
    }
};
