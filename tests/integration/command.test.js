import { jest } from '@jest/globals';
import fs from 'fs';
import { createFakeConnection } from '../fakes/connection.fake.js';
import { createFakeMessage } from '../fakes/message.fake.js';

// Trace helper
const trace = (msg) => {
    try {
        fs.appendFileSync('test_trace.txt', `[${new Date().toISOString()}] ${msg}\n`);
    } catch (e) { }
};

trace('STARTING TEST ENTRY');

// Mocks
jest.unstable_mockModule('../../src/utils/logger.js', () => {
    trace('Mocking logger');
    return {
        log: { error: jest.fn(), action: jest.fn() },
        logger: { child: jest.fn().mockReturnThis(), info: jest.fn(), error: jest.fn() }
    };
});

jest.unstable_mockModule('../../src/utils/performance.js', () => {
    trace('Mocking performance');
    return {
        getSystemMetrics: jest.fn().mockResolvedValue({
            uptime: 100,
            memory: { used: 50, total: 100, rss: 60 }
        }),
        recordCommandTime: jest.fn()
    };
});

jest.unstable_mockModule('../../src/utils/buttons.js', () => {
    trace('Mocking buttons');
    return {
        sendSimpleButtons: jest.fn().mockResolvedValue({ key: { id: 'BUTTON_MSG' } }),
        sendInteractive: jest.fn().mockResolvedValue({ key: { id: 'INTERACTIVE_MSG' } })
    };
});

jest.unstable_mockModule('../../src/utils/messaging.js', () => {
    trace('Mocking messaging');
    return {
        react: jest.fn(),
        withReaction: jest.fn((conn, m, emoji, fn) => fn())
    };
});

trace('Importing plugins.js...');
const { commands } = await import('../../lib/plugins.js');
trace(`plugins.js imported. Initial commands: ${JSON.stringify(Object.keys(commands))}`);

trace('Importing general.js...');
try {
    await import('../../plugins/general.js');
    trace('general.js imported successfully');
} catch (e) {
    trace(`Error importing general.js: ${e.message}\n${e.stack}`);
}

trace(`Commands after loading general.js: ${JSON.stringify(Object.keys(commands))}`);

const { sendSimpleButtons } = await import('../../src/utils/buttons.js');
const { react } = await import('../../src/utils/messaging.js');

describe('Integration: General Commands', () => {
    let conn;
    let m;

    beforeEach(() => {
        try {
            trace('beforeEach starting');
            conn = createFakeConnection();
            trace('Fake connection created');
            m = createFakeMessage('.ping');
            trace('Fake message created');
        } catch (e) {
            trace(`Error in beforeEach: ${e.message}\n${e.stack}`);
            throw e;
        }
    });

    test('should execute ping command successfully', async () => {
        trace('Test body executing');
        const keys = Object.keys(commands);
        trace(`Test body commands: ${JSON.stringify(keys)}`);

        const pingCmd = commands['ping'];
        expect(pingCmd).toBeDefined();

        trace('Executing ping handler...');
        await pingCmd.handler(m, {
            conn,
            botPrefix: '.',
            args: [],
            text: '',
            isOwner: false,
            isGroup: false
        });
        trace('Ping handler finished');

        expect(react).toHaveBeenCalledWith(conn, m, '⚡');

        expect(sendSimpleButtons).toHaveBeenCalledWith(
            conn,
            m.chat,
            expect.stringMatching(/⚡ \*Pong:\* \d+ms/),
            expect.any(Array),
            expect.any(Object)
        );

        expect(react).toHaveBeenCalledWith(conn, m, '✅');
        trace('Assertions passed');
    });
});
