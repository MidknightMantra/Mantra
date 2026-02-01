import { addCommand } from '../lib/plugins.js';
import { UI } from '../src/utils/design.js';

addCommand({
    pattern: 'help',
    alias: ['h'],
    desc: 'Get help with commands',
    category: 'general',
    handler: async (m, { conn, text }) => {
        const command = text.trim();

        if (!command) {
            // General help
            const helpMsg = `${UI.box('💡 MANTRA HELP CENTER')}

${UI.section('GET STARTED', '🚀')}
${UI.list([
                'Browse commands: .menu',
                'Command help: .help <command>',
                'Quick actions: .start'
            ])}

${UI.section('POPULAR COMMANDS', '⭐')}
${UI.numberedList([
                '.ai <text> - Chat with AI',
                '.download <url> - Download media',
                '.sticker - Create stickers',
                '.save - Save status updates'
            ])}

${UI.section('NEED MORE HELP?', '📞')}
${UI.list([
                'Type .menu to explore all features',
                'Each command shows usage when used incorrectly',
                'React 👍 to save bot responses'
            ], 'secondary')}

${UI.footer('Need assistance? Contact the owner')}`;

            await m.reply(helpMsg);
        } else {
            // Specific command help
            await m.reply(`${UI.loading('Looking up command')} \`${command}\``);
        }
    }
});
