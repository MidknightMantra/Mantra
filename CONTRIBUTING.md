# Contributing to Mantra

Thank you for your interest in contributing! 🎉

## Development Setup

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/Mantra.git`
3. Install dependencies: `npm install`
4. Create a branch: `git checkout -b feature/awesome-feature`

## Code Style

We use ESLint and Prettier:
```bash
npm run lint:fix   # Auto-fix linting issues
npm run format     # Format code
```

**Pre-commit hooks** automatically run these checks.

## Adding a Command

Create `plugins/mycommand.js`:
```javascript
import { addCommand } from '../lib/plugins.js';

addCommand({
    pattern: 'mycommand',
    desc: 'Description of my command',
    category: 'general',
    filename: __filename,
    handler: async (m, { conn }) => {
        await m.reply('Hello from my command!');
    }
});
```

**Optional features:**
```javascript
{
    pattern: 'mycommand',
    alias: ['mc', 'mycmd'],      // Alternative names
    category: 'tools',            // Category in menu
    cacheable: true,              // Enable response caching
    rateLimit: false,             // Disable rate limiting
    cooldown: false,              // Disable cooldown
    handler: async (m, { conn }) => { /* ... */ }
}
```

## Testing

Write tests in `tests/unit/`:
```javascript
import { myFunction } from '../../src/utils/myutil.js';

describe('My Function', () => {
    test('should work correctly', () => {
        expect(myFunction('input')).toBe('output');
    });
});
```

Run tests:
```bash
npm test
npm run test:coverage
```

## Pull Request Process

1. Update documentation if needed
2. Add tests for new features
3. Ensure all tests pass: `npm test`
4. Ensure linting passes: `npm run lint`
5. Submit PR with clear description

## Code Review

PRs will be reviewed for:
- Code quality and style
- Test coverage
- Documentation
- Performance impact

## Questions?

Open an issue or discussion on GitHub!

---

**Happy coding!** 🚀
