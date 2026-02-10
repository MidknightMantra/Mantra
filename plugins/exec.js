const util = require('util');
const axios = require('axios');

const owners = [
  '61620516597944@lid',
  '254710407153@s.whatsapp.net'
];

let sentOnce = new Set();

module.exports = {
  name: 'exec',
  aliases: ['>'],
  description: 'Execute JavaScript code (Owner only)',

  async execute() { },

  async onMessage(sock, m) {
    if (!m.text || m.isBot) return;
    if (!m.text.startsWith('>')) return;
    if (sentOnce.has(m.id)) return;
    sentOnce.add(m.id);

    if (!owners.includes(m.sender)) {
      return;
    }

    const code = m.text.slice(1).trim();

    const info = '*Mantra Exec*';
    const imgUrl = 'https://files.catbox.moe/rg0pnn.jpg';
    const author = 'MidknightMantra';
    const botname = 'Mantra';
    const sourceUrl = 'https://abztech.my.id/';

    try {
      const sandbox = {
        sock,
        m,
        axios,
        util,
        console,
        proto,
        generateWAMessageFromContent: global.generateWAMessageFromContent
      };

      const AsyncFunction = Object.getPrototypeOf(async function () { }).constructor;

      let result;
      if (code.includes('await') || code.includes('\n')) {
        result = await new AsyncFunction(...Object.keys(sandbox), code)(...Object.values(sandbox));
      } else {
        result = await new Function(...Object.keys(sandbox), `return ${code}`)(...Object.values(sandbox));
      }

      const output =
        result === undefined
          ? 'undefined'
          : typeof result === 'string'
            ? result
            : util.inspect(result, { depth: 1 });

      const text = `☑️ Result:\n\`\`\`\n${output.slice(0, 4000)}\n\`\`\``;
      const thumbnailBuffer = (await axios.get(imgUrl, { responseType: 'arraybuffer' })).data;

      await m.send(`${info}\n${text}`, {
        contextInfo: {
          forwardingScore: 999,
          isForwarded: true,
          externalAdReply: {
            title: author,
            body: botname,
            thumbnail: thumbnailBuffer,
            mediaType: 1,
            renderLargerThumbnail: true,
            sourceUrl
          }
        }
      });
    } catch (err) {
      await m.send(`❌ Error:\n\`\`\`\n${err.message}\n\`\`\``);
    }

    setTimeout(() => sentOnce.delete(m.id), 5000);
  }
};
