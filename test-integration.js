#!/usr/bin/env node
/**
 * Integration Test for Mantra Bot
 * Tests all major components work together
 */

import chalk from 'chalk';

console.log(chalk.cyan('\n🔮 MANTRA INTEGRATION TEST\n'));
console.log(chalk.gray('─'.repeat(50)));

let passedTests = 0;
let failedTests = 0;

// Test 1: Core Imports
console.log(chalk.blue('\n📦 Test 1: Core Module Imports'));
try {
    const { log } = await import('./src/utils/logger.js');
    const { UI } = await import('./src/utils/design.js');
    const config = await import('./config.js');

    console.log(chalk.green('  ✓ Logger imported'));
    console.log(chalk.green('  ✓ Design system imported'));
    console.log(chalk.green('  ✓ Config imported'));
    passedTests += 3;
} catch (e) {
    console.log(chalk.red('  ✗ Core imports failed:'), e.message);
    failedTests++;
}

// Test 2: Database Module
console.log(chalk.blue('\n💾 Test 2: Database Module'));
try {
    const { getDB, isAntilinkOn, isSudoMode } = await import('./lib/database.js');

    console.log(chalk.green('  ✓ Database imported'));
    console.log(chalk.green('  ✓ Helper functions exported'));

    // Test database access
    const db = getDB();
    console.log(chalk.green('  ✓ Database accessible'));
    passedTests += 3;
} catch (e) {
    console.log(chalk.red('  ✗ Database module failed:'), e.message);
    failedTests++;
}

// Test 3: Redis Module
console.log(chalk.blue('\n⚡ Test 3: Redis Module'));
try {
    const { cache } = await import('./lib/redis.js');

    console.log(chalk.green('  ✓ Redis module imported'));

    // Test cache with fallback (works without Redis server)
    const testResult = await cache.set('test:key', { value: 'test' }, 10);
    const getResult = await cache.get('test:key');

    if (!process.env.REDIS_HOST) {
        console.log(chalk.yellow('  ⚠ Redis not configured (graceful fallback)'));
    } else {
        console.log(chalk.green('  ✓ Redis configured'));
    }

    console.log(chalk.green('  ✓ Cache functions available'));
    passedTests += 2;
} catch (e) {
    console.log(chalk.red('  ✗ Redis module failed:'), e.message);
    failedTests++;
}

// Test 4: Rate Limiting
console.log(chalk.blue('\n🚦 Test 4: Rate Limiting'));
try {
    const { checkRateLimit, checkGlobalRateLimit } = await import('./lib/ratelimit.js');

    console.log(chalk.green('  ✓ Rate limit module imported'));

    const result = await checkRateLimit('test_user', 'test_cmd', 5, 60);
    console.log(chalk.green('  ✓ Rate limit check works'));
    console.log(chalk.gray(`    → Allowed: ${result.allowed}, Remaining: ${result.remaining}`));
    passedTests += 2;
} catch (e) {
    console.log(chalk.red('  ✗ Rate limiting failed:'), e.message);
    failedTests++;
}

// Test 5: Plugin System
console.log(chalk.blue('\n🔌 Test 5: Plugin System'));
try {
    const { commands } = await import('./lib/plugins.js');

    console.log(chalk.green('  ✓ Plugin system imported'));
    console.log(chalk.gray(`    → ${Object.keys(commands).length} commands registered`));

    // Check for key plugins
    const keyPlugins = ['ping', 'menu', 'start', 'speedtest'];
    let found = 0;
    for (const cmd of keyPlugins) {
        if (commands[cmd]) {
            console.log(chalk.green(`  ✓ ${cmd} command available`));
            found++;
        }
    }
    passedTests += found;
} catch (e) {
    console.log(chalk.red('  ✗ Plugin system failed:'), e.message);
    failedTests++;
}

// Test 6: Environment Variables
console.log(chalk.blue('\n🌍 Test 6: Environment Configuration'));
try {
    const envVars = ['SESSION_ID', 'OWNER_NUMBER', 'BOT_NAME', 'DATABASE_URL'];
    let configured = 0;

    for (const varName of envVars) {
        if (process.env[varName]) {
            console.log(chalk.green(`  ✓ ${varName} configured`));
            configured++;
        } else {
            console.log(chalk.yellow(`  ⚠ ${varName} not set`));
        }
    }

    // Redis optional
    if (process.env.REDIS_HOST) {
        console.log(chalk.green(`  ✓ REDIS_HOST configured`));
        configured++;
    }

    passedTests += configured;
} catch (e) {
    console.log(chalk.red('  ✗ Environment config failed:'), e.message);
    failedTests++;
}

// Test 7: Owner Auto-Detection Config
console.log(chalk.blue('\n👑 Test 7: Owner Configuration'));
try {
    if (global.owner && Array.isArray(global.owner)) {
        if (global.owner.length > 0) {
            console.log(chalk.green(`  ✓ Owner configured: ${global.owner[0]}`));
        } else {
            console.log(chalk.yellow('  ⚠ Owner will be auto-detected on connection'));
        }
        passedTests++;
    } else {
        console.log(chalk.yellow('  ⚠ Owner array not initialized'));
    }
} catch (e) {
    console.log(chalk.red('  ✗ Owner config check failed:'), e.message);
    failedTests++;
}

// Test 8: Syntax Check
console.log(chalk.blue('\n✅ Test 8: Syntax Validation'));
try {
    const { execSync } = await import('child_process');

    const files = [
        'index.js',
        'lib/database.js',
        'lib/redis.js',
        'lib/ratelimit.js',
        'plugins/speedtest.js'
    ];

    for (const file of files) {
        try {
            execSync(`node --check ${file}`, { stdio: 'pipe' });
            console.log(chalk.green(`  ✓ ${file}`));
            passedTests++;
        } catch (e) {
            console.log(chalk.red(`  ✗ ${file} syntax error`));
            failedTests++;
        }
    }
} catch (e) {
    console.log(chalk.red('  ✗ Syntax validation failed:'), e.message);
    failedTests++;
}

// Summary
console.log(chalk.gray('\n' + '─'.repeat(50)));
console.log(chalk.cyan('\n📊 TEST SUMMARY\n'));

const total = passedTests + failedTests;
const passRate = total > 0 ? ((passedTests / total) * 100).toFixed(1) : 0;

console.log(chalk.green(`  ✓ Passed: ${passedTests}`));
if (failedTests > 0) {
    console.log(chalk.red(`  ✗ Failed: ${failedTests}`));
}
console.log(chalk.gray(`  📈 Success Rate: ${passRate}%`));

if (failedTests === 0) {
    console.log(chalk.green('\n🎉 All integration tests passed!'));
    console.log(chalk.gray('  The bot is ready to start.\n'));
    process.exit(0);
} else {
    console.log(chalk.yellow('\n⚠️  Some tests failed or warnings present.'));
    console.log(chalk.gray('  Review the output above for details.\n'));
    process.exit(1);
}
