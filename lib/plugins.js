/**
 * Enhanced Command Registry with Performance Tracking
 * Provides registration, aliasing, and command management
 */

import { log } from '../src/utils/logger.js';

// Command registry
export const commands = {};

/**
 * Enhanced command registration with performance tracking
 * @param {Object} cmdObj - Command configuration object
 */
export const addCommand = (cmdObj) => {
    if (!cmdObj.pattern) {
        log.error('Command registration failed', new Error('No pattern provided'), cmdObj);
        return;
    }

    // Wrap handler with performance tracking
    const originalHandler = cmdObj.handler;

    cmdObj.handler = async (m, context) => {
        const startTime = Date.now();
        let success = true;

        try {
            // Execute original handler
            const result = await originalHandler(m, { ...context, commandName: cmdObj.pattern });
            return result;
        } catch (error) {
            success = false;
            log.error(`Command ${cmdObj.pattern} failed`, error, { user: m.sender });
            throw error;
        } finally {
            // Track performance (dynamic import to avoid circular dependency)
            const duration = Date.now() - startTime;
            try {
                const { recordCommandTime } = await import('../src/utils/performance.js');
                await recordCommandTime(cmdObj.pattern, duration, success, m.sender);
            } catch (perfError) {
                // Silently fail if performance tracking unavailable
            }
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