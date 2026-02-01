/**
 * Unit tests for analytics service
 */

import { analytics } from '../../src/services/analytics.js';

describe('Analytics Service', () => {
    beforeEach(() => {
        analytics.clear();
    });

    test('should track command execution', () => {
        analytics.trackCommand('ping', '254700000000@s.whatsapp.net', false, 50);
        const stats = analytics.getStats();

        expect(stats.totalCommands).toBe(1);
        expect(stats.uniqueUsers).toBe(1);
    });

    test('should track multiple users', () => {
        analytics.trackCommand('ping', 'user1@s.whatsapp.net', false, 50);
        analytics.trackCommand('ping', 'user2@s.whatsapp.net', false, 50);

        const stats = analytics.getStats();
        expect(stats.uniqueUsers).toBe(2);
    });

    test('should calculate average response time', () => {
        analytics.trackCommand('ping', 'user@s.whatsapp.net', false, 100);
        analytics.trackCommand('menu', 'user@s.whatsapp.net', false, 200);

        const stats = analytics.getStats();
        expect(stats.avgResponseTime).toBe(150);
    });

    test('should track top commands', () => {
        analytics.trackCommand('ping', 'user@s.whatsapp.net', false, 50);
        analytics.trackCommand('ping', 'user@s.whatsapp.net', false, 50);
        analytics.trackCommand('menu', 'user@s.whatsapp.net', false, 50);

        const topCommands = analytics.getPopularCommands(5);
        expect(topCommands[0][0]).toBe('ping');
        expect(topCommands[0][1]).toBe(2);
    });

    test('should track errors', () => {
        const error = new Error('Test error');
        analytics.trackError(error, { command: 'test', user: 'user@s.whatsapp.net' });

        const stats = analytics.getStats();
        expect(stats.recentErrors.length).toBeGreaterThan(0);
    });

    test('should export analytics data', () => {
        analytics.trackCommand('ping', 'user@s.whatsapp.net', false, 50);
        const exported = analytics.export();

        expect(exported.stats).toBeDefined();
        expect(exported.commands).toBeDefined();
        expect(exported.users).toBeDefined();
    });
});
