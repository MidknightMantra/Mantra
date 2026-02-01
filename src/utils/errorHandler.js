import { log } from '../utils/logger.js';
import { CONFIG, MESSAGES } from '../config/constants.js';

/**
 * Global error handler wrapper for command handlers
 * Catches all errors and provides user-friendly feedback
 */
export function withErrorHandler(handler) {
    return async (m, context) => {
        const startTime = Date.now();

        try {
            // Execute the command
            const result = await handler(m, context);

            // Log successful execution
            log.command(context.commandName || 'unknown', m.sender, true);
            log.perf(context.commandName, Date.now() - startTime);

            return result;
        } catch (error) {
            // Log the error with context
            log.error('Command execution failed', error, {
                command: context.commandName,
                user: m.sender,
                chat: m.chat,
                isGroup: m.isGroup
            });

            // Send user-friendly error message
            let errorMessage = MESSAGES.ERRORS.COMMAND_FAILED;

            // Handle specific error types
            if (error.message?.includes('rate limit')) {
                errorMessage = error.message;
            } else if (error.message?.includes('permission')) {
                errorMessage = MESSAGES.ERRORS.PERMISSION_DENIED;
            } else if (error.message?.includes('cooldown')) {
                errorMessage = error.message;
            }

            try {
                await m.reply(errorMessage);
            } catch (replyError) {
                log.error('Failed to send error message', replyError);
            }

            // Re-throw critical errors
            if (error.critical) {
                throw error;
            }
        }
    };
}

/**
 * Async error boundary for the entire bot
 * Catches unhandled promise rejections
 */
export function initGlobalErrorHandlers() {
    process.on('unhandledRejection', (reason, promise) => {
        log.error('Unhandled Rejection', new Error(String(reason)), {
            promise: String(promise)
        });
    });

    process.on('uncaughtException', (error) => {
        log.error('Uncaught Exception', error, { critical: true });

        // Give time to write logs before exiting
        setTimeout(() => {
            process.exit(1);
        }, 1000);
    });
}

/**
 * Graceful shutdown handler
 */
export function setupGracefulShutdown(conn) {
    const shutdown = async (signal) => {
        console.log(`\n📡 Received ${signal}, shutting down gracefully...`);

        try {
            // Clear intervals
            if (conn.presenceInterval) {
                clearInterval(conn.presenceInterval);
            }

            // Close connection
            if (conn.ws) {
                conn.ws.close();
            }

            log.action('Bot shutdown', 'system', { signal });

            process.exit(0);
        } catch (error) {
            log.error('Shutdown error', error);
            process.exit(1);
        }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
}

export default {
    withErrorHandler,
    initGlobalErrorHandlers,
    setupGracefulShutdown
};
