import { sanitize } from '../../src/utils/validators.js';

describe('Sanitizers', () => {
    describe('text sanitizer', () => {
        test('should remove HTML-like characters', () => {
            const input = '<script>alert("xss")</script>';
            const output = sanitize.text(input);
            expect(output).not.toContain('<');
            expect(output).not.toContain('>');
            expect(output).toBe('scriptalert("xss")/script');
        });

        test('should trim leading and trailing whitespace', () => {
            expect(sanitize.text('   hello world   ')).toBe('hello world');
        });

        test('should handle multi-line input correctly', () => {
            const input = '  line 1  \n  line 2  ';
            const output = sanitize.text(input);
            expect(output).toBe('line 1  \n  line 2');
        });

        test('should return empty string for null or undefined', () => {
            expect(sanitize.text(null)).toBe('');
            expect(sanitize.text(undefined)).toBe('');
        });

        test('should return empty string for empty input', () => {
            expect(sanitize.text('')).toBe('');
        });
    });
});
