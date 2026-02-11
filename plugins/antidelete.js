module.exports = {
    name: "antidelete",
    category: "security",

    execute: async (sock, m, mantra) => {
        const state = m.args[0];
        if (state === 'on') mantra.settings.antidelete = true;
        if (state === 'off') mantra.settings.antidelete = false;

        mantra.saveSettings();
        m.reply(`AntiDelete is now ${mantra.settings.antidelete ? 'ON' : 'OFF'}`);
    },

    onMessageUpdate: async (sock, updates, mantra) => {
        if (!mantra.settings.antidelete) return;

        for (const u of updates) {
            const isDeleted =
                u.update?.messageStubType === 2 ||
                u.update?.message?.protocolMessage?.type === 0;

            if (!isDeleted) continue; // 🔥 THIS IS THE FIX

            const cached = mantra.messageStore.get(u.key.id);
            if (!cached) continue;

            await sock.sendMessage(sock.user.id, {
                text:
`🗑️ Deleted Message

From: ${cached.sender}
Chat: ${cached.from}

Message:
${cached.body || '[media]'}`
            });
        }
    }
};
