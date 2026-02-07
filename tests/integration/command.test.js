import { jest } from '@jest/globals';
import { createFakeConnection } from '../fakes/connection.fake.js';
import { createFakeMessage } from '../fakes/message.fake.js';

// 1. Mock detailed dependencies
jest.unstable_mockModule('../../src/utils/logger.js', () => ({
    log: { error: jest.fn(), action: jest.fn() },
    logger: { child: jest.fn().mockReturnThis(), info: jest.fn(), error: jest.fn() }
}));

jest.unstable_mockModule('../../src/utils/performance.js', () => ({
    getSystemMetrics: jest.fn().mockResolvedValue({
        uptime: 100,
        memory: { used: 50, total: 100, rss: 60 }
    }),
    recordCommandTime: jest.fn()
}));

jest.unstable_mockModule('../../src/utils/buttons.js', () => ({
    sendSimpleButtons: jest.fn().mockResolvedValue({ key: { id: 'BUTTON_MSG' } }),
    sendInteractive: jest.fn().mockResolvedValue({ key: { id: 'INTERACTIVE_MSG' } })
}));

jest.unstable_mockModule('../../src/utils/messaging.js', () => ({
    react: jest.fn(),
    withReaction: jest.fn((conn, m, emoji, fn) => fn())
}));

jest.unstable_mockModule('../../src/utils/design.js', () => ({
    UI: { error: jest.fn(), syntax: jest.fn(), box: jest.fn(), DIVIDER: { light: '--', heavy: '==' } },
    Format: { time: jest.fn() }
}));

// 2. Import modules dynamically after mocks
const { commands } = await import('../../lib/plugins.js');

// 3. Load the plugin (which registers 'ping')
await import('../../plugins/general.js');

describe('Integration: General Commands', () => {
    let conn;
    let m;
    let buttonsMock;
    let messagingMock;

    beforeAll(async () => {
        buttonsMock = await import('../../src/utils/buttons.js');
        messagingMock = await import('../../src/utils/messaging.js');
    });

    beforeEach(() => {
        conn = createFakeConnection();
        m = createFakeMessage('.ping');
        jest.clearAllMocks();
    });

    test('should register and execute ping command', async () => {
        const pingCmd = commands['ping'];
        expect(pingCmd).toBeDefined();
        expect(pingCmd.category).toBe('general');

        // Execute
        await pingCmd.handler(m, {
            conn,
            botPrefix: '.',
            args: [],
            text: '',
            isOwner: false,
            isGroup: false
        });

        // Verify React (Lightning)
        expect(messagingMock.react).toHaveBeenNthCalledWith(1, conn, m, '⚡');

        // Verify Buttons (Pong)
        expect(buttonsMock.sendSimpleButtons).toHaveBeenCalledWith(
            conn,
            m.chat,
            expect.stringMatching(/⚡ \*Pong:\* \d+ms/),
            expect.any(Array),
            expect.any(Object)
        );

        // Verify React (Check)
        expect(messagingMock.react).toHaveBeenLastCalledWith(conn, m, '✅');
    });
});
