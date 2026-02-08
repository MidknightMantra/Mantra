/**
 * Enhanced Command Registry with Performance Tracking
 * Provides registration, aliasing, and command management
 */

import { log } from '../src/utils/logger.js';
import fs from 'fs';
import path from 'path';

// Command registry
export const commands = {};

/**
 * Enhanced command registration with performance tracking
 * @param {Object} cmdObj - Command configuration object
 */
export const addCommand = (cmdObj, filename = '') => {
    // Auto-detect filename if not provided
    if (!filename) {
        try {
            const stack = new Error().stack;
            const stackLines = stack.split('\n');
            // Look for the caller line (usually index 2 or 3 depending on environment)
            const callerLine = stackLines.find(line => line.includes('plugins') && line.includes('.js'));
            if (callerLine) {
                const match = callerLine.match(/([a-zA-Z0-9_-]+\.js)/);
                if (match) {
                    filename = match[1];
                }
            }
        } catch (e) {
            // Ignore stack trace errors
        }
    }

    console.log('Registering command:', cmdObj.pattern || `[on: ${cmdObj.on}]`);
    if (!cmdObj.pattern && !cmdObj.on) {
        log.error('Command registration failed', new Error('No pattern or "on" property provided'), cmdObj);
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
    commands[cmdObj.pattern] = { ...cmdObj, filename };

    // Register aliases
    if (cmdObj.alias && Array.isArray(cmdObj.alias)) {
        cmdObj.alias.forEach(alias => {
            commands[alias] = { ...cmdObj, filename, isAlias: true, originalPattern: cmdObj.pattern };
        });
    }

    log.action('Command registered', 'system', {
        pattern: cmdObj.pattern,
        aliases: cmdObj.alias || [],
        category: cmdObj.category || 'general'
    });
};

/**
 * Remove all commands associated with a specific plugin file
 */
export function removePluginCommands(filename) {
    if (!filename) return 0;

    let count = 0;
    for (const [key, cmd] of Object.entries(commands)) {
        if (cmd.filename === filename) {
            delete commands[key];
            count++;
        }
    }
    return count;
}

/**
 * Reload a specific plugin file
 */
export async function reloadPlugin(filePath) {
    const filename = path.basename(filePath);
    try {
        // 1. Remove old commands
        const removed = removePluginCommands(filename);

        // 2. Clear from ESM cache (by using query param cache busting)
        const fileUrl = `file://${filePath}?update=${Date.now()}`;

        // 3. Re-import
        await import(fileUrl);

        log.action('Plugin Hot-Reloaded', 'system', { filename, removedCommands: removed });
        return true;
    } catch (error) {
        log.error(`Failed to hot-reload plugin: ${filename}`, error);
        return false;
    }
}

/**
 * Watch plugins directory for changes
 */
export function watchPlugins(pluginDir) {
    let fsWait = false;

    fs.watch(pluginDir, (eventType, filename) => {
        if (filename && filename.endsWith('.js')) {
            if (fsWait) return;

            // Debounce
            fsWait = setTimeout(() => {
                fsWait = false;
            }, 100);

            const filePath = path.join(pluginDir, filename);
            if (fs.existsSync(filePath)) {
                console.log(`🔥 Plugin Changed: ${filename} - Reloading...`);
                reloadPlugin(filePath);
            }
        }
    });
}

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
    hasCommand,
    removePluginCommands,
    reloadPlugin,
    watchPlugins
};