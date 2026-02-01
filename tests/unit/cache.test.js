/**
 * Unit tests for cache utilities
 */

import { cache, debounce, throttle } from '../../src/utils/cache.js';

describe('Cache Utility', () => {
    beforeEach(() => {
        cache.clear();
    });

    test('should store and retrieve values', () => {
        cache.set('test-key', 'test-value');
        expect(cache.get('test-key')).toBe('test-value');
    });

    test('should return null for non-existent keys', () => {
        expect(cache.get('non-existent')).toBeNull();
    });

    test('should respect TTL and expire values', (done) => {
        const shortCache = cache;
        shortCache.ttl = 100; // 100ms TTL

        shortCache.set('temp-key', 'temp-value');
        expect(shortCache.get('temp-key')).toBe('temp-value');

        setTimeout(() => {
            expect(shortCache.get('temp-key')).toBeNull();
            done();
        }, 150);
    });

    test('should generate consistent cache keys', () => {
        const key1 = cache.generateKey('ping', '', 'user123');
        const key2 = cache.generateKey('ping', '', 'user123');
        expect(key1).toBe(key2);
    });

    test('should clear all cached values', () => {
        cache.set('key1', 'value1');
        cache.set('key2', 'value2');
        cache.clear();
        expect(cache.get('key1')).toBeNull();
        expect(cache.get('key2')).toBeNull();
    });
});

describe('Debounce Utility', () => {
    test('should debounce function calls', (done) => {
        let counter = 0;
        const increment = () => counter++;
        const debouncedIncrement = debounce(increment, 50);

        debouncedIncrement();
        debouncedIncrement();
        debouncedIncrement();

        expect(counter).toBe(0); // Not called yet

        setTimeout(() => {
            expect(counter).toBe(1); // Called once after debounce
            done();
        }, 100);
    });
});

describe('Throttle Utility', () => {
    test('should throttle function calls', (done) => {
        let counter = 0;
        const increment = () => ++counter;
        const throttledIncrement = throttle(increment, 50);

        const result1 = throttledIncrement(); // Called
        const result2 = throttledIncrement(); // Throttled
        const result3 = throttledIncrement(); // Throttled

        expect(result1).toBe(1);
        expect(result2).toBe(1); // Returns last result
        expect(result3).toBe(1);

        setTimeout(() => {
            const result4 = throttledIncrement(); // Called again
            expect(result4).toBe(2);
            done();
        }, 100);
    });
});
