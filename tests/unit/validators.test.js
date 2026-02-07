/**
 * Unit tests for validators
 */

import { validate, sanitize, guards } from '../../src/utils/validators.js';

describe('Validators', () => {
    describe('phoneNumber', () => {
        test('should validate correct international phone numbers', () => {
            expect(validate.phoneNumber('254700000000')).toBe(true);
            expect(validate.phoneNumber('16452087258')).toBe(true);
        });

        test('should validate local phone numbers', () => {
            expect(validate.phoneNumber('0712345678')).toBe(true);
        });

        test('should reject numbers with special characters', () => {
            expect(validate.phoneNumber('+1645-208-7258')).toBe(false);
            expect(validate.phoneNumber('(123) 456-7890')).toBe(false);
        });

        test('should reject too short or too long numbers', () => {
            expect(validate.phoneNumber('123')).toBe(false);
            expect(validate.phoneNumber('1'.repeat(20))).toBe(false);
        });

        test('should reject non-numeric input', () => {
            expect(validate.phoneNumber('abcdefghijk')).toBe(false);
            expect(validate.phoneNumber('')).toBe(false);
            expect(validate.phoneNumber(null)).toBe(false);
        });
    });

    describe('url', () => {
        test('should validate various valid URL formats', () => {
            expect(validate.url('https://google.com')).toBe(true);
            expect(validate.url('http://example.com/path?query=1')).toBe(true);
            expect(validate.url('https://sub.domain.co.uk')).toBe(true);
        });

        test('should reject invalid URL patterns', () => {
            expect(validate.url('not a url')).toBe(false);
            expect(validate.url('ftp://server.com')).toBe(false); // If we only want http/s
            expect(validate.url('www.missingprotocol.com')).toBe(false);
        });
    });

    describe('messageLength', () => {
        test('should validate reasonable message lengths', () => {
            expect(validate.messageLength('Hello')).toBe(true);
            expect(validate.messageLength('A'.repeat(5000))).toBe(true);
        });

        test('should reject extremely long or empty messages', () => {
            expect(validate.messageLength('A'.repeat(100001))).toBe(false);
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
