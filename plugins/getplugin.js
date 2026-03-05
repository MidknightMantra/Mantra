/*****************************************************************************
 *                                                                           *
 *                     Developed By Midknight Mantra                                *
 *                                                                           *
 *  🌐  GitHub   : https://github.com/MidknightMantra                         *
 *  ▶️  YouTube  : https://youtube.com/@MidknightMantra                       *
 *  💬  WhatsApp : https://whatsapp.com/channel/0029Vb74Dlf4CrfoqpAEBC2T     *
 *                                                                           *
 *    © 2026 MidknightMantra. All rights reserved.                            *
 *                                                                           *
 *    Description: This file is part of the Mantra Project.                 *
 *                 Unauthorized copying or distribution is prohibited.       *
 *                                                                           *
 *****************************************************************************/


const fs = require('fs');
const path = require('path');

module.exports = {
  command: 'inspect',
  aliases: ['cat', 'readcode', 'getplugin'],
  category: 'owner',
  description: 'Read the source code of a specific plugin',
  usage: '.inspect [plugin_name]',
  ownerOnly: 'true',

  async handler(sock, message, args, context = {}) {
    const chatId = message.key.remoteJid;

    const pluginName = args[0];
    if (!pluginName) {
      return await sock.sendMessage(chatId, { text: 'Which plugin do you want to inspect? Example: *.inspect convert*' }, { quoted: message });
    }

    try {
      const pluginsDir = path.join(__dirname, '../plugins');
      
      const fileName = pluginName.endsWith('.js') ? pluginName : `${pluginName}.js`;
      const filePath = path.join(pluginsDir, fileName);

      if (!fs.existsSync(filePath)) {
        return await sock.sendMessage(chatId, { text: `❌ Plugin "${fileName}" not found.` }, { quoted: message });
      }

      const code = fs.readFileSync(filePath, 'utf8');

      const formattedCode = `💻 *SOURCE CODE: ${fileName}*\n\n\`\`\`javascript\n${code}\n\`\`\``;

      if (formattedCode.length > 4000) {
        await sock.sendMessage(chatId, {
          document: Buffer.from(code),
          fileName: fileName,
          mimetype: 'text/javascript',
          caption: `📄 Code for *${fileName}* (File too large for text message)`
        }, { quoted: message });
      } else {
        await sock.sendMessage(chatId, { text: formattedCode }, { quoted: message });
      }

    } catch (error) {
      console.error('Inspect Error:', error);
      await sock.sendMessage(chatId, { text: '❌ Failed to read the plugin file.' });
    }
  }
};

/*****************************************************************************
 *                                                                           *
 *                     Developed By Midknight Mantra                                *
 *                                                                           *
 *  🌐  GitHub   : https://github.com/MidknightMantra                         *
 *  ▶️  YouTube  : https://youtube.com/@MidknightMantra                       *
 *  💬  WhatsApp : https://whatsapp.com/channel/0029Vb74Dlf4CrfoqpAEBC2T     *
 *                                                                           *
 *    © 2026 MidknightMantra. All rights reserved.                            *
 *                                                                           *
 *    Description: This file is part of the Mantra Project.                 *
 *                 Unauthorized copying or distribution is prohibited.       *
 *                                                                           *
 *****************************************************************************/
 
