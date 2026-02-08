import winston from 'winston';
import { CONFIG } from '../config/constants.js';

// Create logs directory if it doesn't exist
import { mkdirSync } from 'fs';
try {
    mkdirSync('logs', { recursive: true });
} catch (e) {
    // Directory exists
}

// Custom format for console output
const consoleFormat = winston.format.combine(
    winston.format.timestamp({ format: 'HH:mm:ss' }),
    winston.format.printf(({ level, message, timestamp, ...meta }) => {
        const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
        return `${timestamp} [${level.toUpperCase()}] ${message} ${metaStr}`;
    })
);

// JSON format for file output
const fileFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
);

// Create logger instance
export const logger = winston.createLogger({
    level: CONFIG.LOGGING.LEVEL,
    transports: [
        // Error log file
        new winston.transports.File({
            filename: CONFIG.LOGGING.ERROR_FILE,
            level: 'error',
            format: fileFormat
        }),
        // Combined log file
        new winston.transports.File({
            filename: CONFIG.LOGGING.COMBINED_FILE,
            format: fileFormat
        })
    ]
});

// Add console transport if enabled
if (CONFIG.LOGGING.CONSOLE_LOGGING) {
    logger.add(new winston.transports.Console({
        format: consoleFormat
    }));
}

// Helper methods for common log patterns
export const log = {
    // General info
    info: (message, context = {}) => {
        logger.info(message, context);
    },

    // Command execution
    command: (commandName, user, success = true) => {
        logger.info('Command executed', {
            command: commandName,
            user: user.split('@')[0],
            success,
            timestamp: Date.now()
        });
    },

    // Errors with context
    error: (message, error, context = {}) => {
        logger.error(message, {
            error: error.message,
            stack: error.stack,
            ...context
        });
    },

    // Warnings
    warn: (message, context = {}) => {
        logger.warn(message, context);
    },

    // Performance metrics
    perf: (operation, duration) => {
        logger.debug('Performance', {
            operation,
            duration: `${duration}ms`
        });
    },

    // Security events
    security: (event, details) => {
        logger.warn('Security event', {
            event,
            ...details,
            timestamp: Date.now()
        });
    },

    // User actions
    action: (action, user, metadata = {}) => {
        logger.info('User action', {
            action,
            user: user.split('@')[0],
            ...metadata
        });
    }
};

// Export default logger
export default logger;
