const fs = require('fs');
const path = require('path');

module.exports = async (sock, m, chatUpdate) => {
    // 1. Basic Extraction (Lightweight)
    const body = (m.message.conversation || m.message.extendedTextMessage?.text || '').trim();
    const isCmd = body.startsWith('!'); // Prefix
    const command = isCmd ? body.slice(1).split(' ')[0].toLowerCase() : '';
    const args = body.trim().split(/ +/).slice(1);
    const text = args.join(" ");
    const sender = m.key.participant || m.key.remoteJid;

    if (!isCmd) return; // Ignore non-commands

    // 2. Plugin Loader
    const pluginFolder = path.join(__dirname, 'plugins');
    if (!fs.existsSync(pluginFolder)) return;

    const files = fs.readdirSync(pluginFolder);

    for (const file of files) {
        // DANGEROUSLY EFFECTIVE: Reload plugin cache instantly
        const pluginPath = path.join(pluginFolder, file);
        delete require.cache[require.resolve(pluginPath)];
        
        const plugin = require(pluginPath);

        // Check if command matches
        if (plugin.cmd && plugin.cmd.includes(command)) {
            try {
                console.log(`[EXEC] ${command} used by ${sender}`);
                await plugin.run({ sock, m, args, text, sender });
            } catch (e) {
                console.error(`[ERROR] Plugin ${file} failed:`, e);
                sock.sendMessage(m.key.remoteJid, { text: 'Bot error: ' + e.message });
            }
        }
    }
};
