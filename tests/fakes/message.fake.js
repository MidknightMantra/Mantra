/**
 * Fake Message Factory for Testing
 */
export const createFakeMessage = (content, options = {}) => {
    const sender = options.sender || '1234567890@s.whatsapp.net';
    const chatId = options.chatId || '1234567890@s.whatsapp.net';
    const isGroup = chatId.endsWith('@g.us');
    const pushName = options.pushName || 'Test User';

    return {
        key: {
            remoteJid: chatId,
            fromMe: options.fromMe || false,
            id: options.id || 'TEST_MSG_ID_' + Date.now(),
            participant: isGroup ? sender : undefined
        },
        message: {
            conversation: content
        },
        pushName: pushName,
        sender: sender,
        from: chatId,
        isGroup: isGroup,
        isBotAdmin: options.isBotAdmin || false,
        isUserAdmin: options.isUserAdmin || false,

        // Convenience methods often added by connection handler
        reply: jest.fn(),
        react: jest.fn()
    };
};

export const createFakeGroupMetadata = (chatId) => {
    return {
        id: chatId,
        subject: 'Test Group',
        participants: [
            { id: '1234567890@s.whatsapp.net', admin: 'admin' },
            { id: '0987654321@s.whatsapp.net', admin: null },
            { id: 'bot@s.whatsapp.net', admin: 'admin' } // Bot is admin by default in mocks
        ]
    };
};
