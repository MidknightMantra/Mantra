/**
 * Enhanced Command Registry with Middleware Support
 * Provides registration, aliasing, and command management
 */

import { withErrorHandler } from '../src/utils/errorHandler.js';
import { rateLimitMiddleware, cooldownMiddleware } from '../src/middleware/ratelimit.js';
import { analytics } from '../src/services/analytics.js';
import { log } from '../src/utils/logger.js';

// Command registry
export const commands = {};

/**
 * Enhanced command registration with middleware support
 * @param {Object} cmdObj - Command configuration object
 */
export const addCommand = (cmdObj) => {
    if (!cmdObj.pattern) {
        log.error('Command registration failed', new Error('No pattern provided'), cmdObj);
        return;
    }

    // Wrap handler with error handling and middleware
    const originalHandler = cmdObj.handler;

    cmdObj.handler = async (m, context) => {
        const startTime = Date.now();

        try {
            // Apply rate limiting if enabled
            if (cmdObj.rateLimit !== false) {
                rateLimitMiddleware(m, cmdObj.pattern);
            }

            // Apply cooldown if enabled
            if (cmdObj.cooldown !== false) {
                cooldownMiddleware(m, cmdObj.pattern);
            }

            // Execute original handler with error boundary
            const wrappedHandler = withErrorHandler(originalHandler);
            const result = await wrappedHandler(m, { ...context, commandName: cmdObj.pattern });

            // Track analytics
            const duration = Date.now() - startTime;
            analytics.trackCommand(cmdObj.pattern, m.sender, m.isGroup, duration);

            return result;
        } catch (error) {
            // Error already logged by withErrorHandler
            analytics.trackError(error, { command: cmdObj.pattern, user: m.sender });
            throw error;
        }
    };

    // Register command
    commands[cmdObj.pattern] = cmdObj;

    // Register aliases
    if (cmdObj.alias && Array.isArray(cmdObj.alias)) {
        cmdObj.alias.forEach(alias => {
            commands[alias] = cmdObj;
        });
    }

    log.action('Command registered', 'system', {
        pattern: cmdObj.pattern,
        aliases: cmdObj.alias || [],
        category: cmdObj.category || 'general'
    });
};

/**
 * Get command by name or alias
 */
export function getCommand(name) {
    return commands[name];
}

/**
 * Get all commands in a category
 */
export function getCommandsByCategory(category) {
    return Object.values(commands).filter(cmd => cmd.category === category);
}

/**
 * Get command count
 */
export function getCommandCount() {
    // Remove duplicates from aliases
    const unique = new Set(Object.values(commands));
    return unique.size;
}

/**
 * Check if command exists
 */
export function hasCommand(name) {
    return name in commands;
}

export default {
    commands,
    addCommand,
    getCommand,
    getCommandsByCategory,
    getCommandCount,
    hasCommand
};