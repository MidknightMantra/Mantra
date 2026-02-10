module.exports = {
    name: 'autoreact',
    description: 'Auto-reacts to messages from owners',

    async execute() { },

    async onMessage(sock, m) {
        try {
            if (!m.body) return;

            const owners = [
                '61620516597944@lid',
                '233533763772@s.whatsapp.net'
            ];

            if (owners.includes(m.sender)) {
                await m.react('✨');
            }
        } catch (err) {
            console.error('❌ Auto-react error:', err);
        }
    }
};
