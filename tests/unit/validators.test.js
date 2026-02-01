/**
 * Unit tests for validators
 */

import { validate, sanitize, guards } from '../../src/utils/validators.js';

describe('Validators', () => {
    describe('phoneNumber', () => {
        test('should validate correct phone numbers', () => {
            expect(validate.phoneNumber('254700000000')).toBe(true);
            expect(validate.phoneNumber('1234567890')).toBe(true);
        });

        test('should reject invalid phone numbers', () => {
            expect(validate.phoneNumber('123')).toBe(false);
            expect(validate.phoneNumber('abc')).toBe(false);
            expect(validate.phoneNumber('')).toBe(false);
        });
    });

    describe('url', () => {
        test('should validate correct URLs', () => {
            expect(validate.url('https://google.com')).toBe(true);
            expect(validate.url('http://example.com')).toBe(true);
        });

        test('should reject invalid URLs', () => {
            expect(validate.url('not a url')).toBe(false);
            expect(validate.url('htp://broken')).toBe(false);
        });
    });

    describe('messageLength', () => {
        test('should validate message length', () => {
            expect(validate.messageLength('Hello')).toBe(true);
            expect(validate.messageLength('A'.repeat(10000))).toBe(true);
        });

        test('should reject too long messages', () => {
            expect(validate.messageLength('A'.repeat(100000))).toBe(false);
            expect(validate.messageLength('')).toBe(false);
        });
    });
});

describe('Sanitizers', () => {
    test('should remove dangerous characters', () => {
        const input = '<script>alert("xss")</script>';
        const output = sanitize.text(input);
        expect(output).not.toContain('<');
        expect(output).not.toContain('>');
    });

    test('should trim whitespace', () => {
        expect(sanitize.text('  hello  ')).toBe('hello');
    });

    test('should handle empty input', () => {
        expect(sanitize.text('')).toBe('');
        expect(sanitize.text(null)).toBe('');
    });
});
