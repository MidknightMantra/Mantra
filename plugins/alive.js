module.exports = {
    name: 'alive',
    description: 'Check if the bot is alive',
    aliases: [],
    tags: ['main'],
    command: /^(alive)$/i,

    async execute(sock, m) {
        try {
            const name = m.pushName || m.sender.split('@')[0];
            const audioUrl = 'https://files.catbox.moe/9h4ttf.mp3';
            const thumbnail = 'https://files.catbox.moe/rg0pnn.jpg';
            const quoted = {
                key: {
                    fromMe: false,
                    participant: m.sender,
                    ...(m.isGroup ? { remoteJid: m.from } : {}),
                },
                message: {
                    contactMessage: {
                        displayName: name,
                        vcard: `BEGIN:VCARD\nVERSION:0.0.7\nN:;a,;;;\nFN:${name}\nitem1.TEL;waid=${m.sender.split('@')[0]}:${m.sender.split('@')[0]}\nitem1.X-ABLabel:Ponsel\nEND:VCARD`,
                    },
                },
            };
            await m.send(
                {
                    audio: { url: audioUrl },
                    mimetype: 'audio/mpeg',
                    ptt: true,
                    waveform: [100, 0, 100, 0, 100, 0, 100],
                    fileName: 'Alive',
                    contextInfo: {
                        mentionedJid: [m.sender],
                        externalAdReply: {
                            title: 'I AM ALIVE',
                            body: 'STATUS',
                            thumbnailUrl: 'https://files.catbox.moe/rg0pnn.jpg',
                            sourceUrl: 'https://www.whatsapp.com/channel/0029VaMGgVL3WHTNkhzHik3c',
                            mediaType: 1,
                            renderLargerThumbnail: true,
                        },
                    },
                },
                { quoted }
            );
        } catch (err) {
            console.error('❌ Alive plugin error:', err);
        }
    },
};
