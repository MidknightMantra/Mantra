/**
 * Centralized Error Handler Middleware
 * Handles all plugin errors with user-friendly messages
 */

import { log } from '../utils/logger.js';
import { UI } from '../utils/design.js';

/**
 * Handle plugin errors with appropriate user messages
 * @param {Error} error - Error object
 * @param {Object} m - Message object
 * @param {string} commandName - Command that failed
 * @returns {Promise<void>}
 */
export async function errorHandler(error, m, commandName) {
    // Log the error with context
    log.error(`Command '${commandName}' failed`, error, {
        user: m.sender,
        chat: m.chat,
        command: commandName,
        errorType: error.constructor.name
    });

    // Network timeout errors
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT' || error.message.includes('timed out')) {
        return m.reply(UI.error(
            'Timeout',
            'Request took too long',
            'Try again later\\nCheck your connection\\nUse a shorter/smaller file'
        ));
    }

    // Rate limiting (429)
    if (error.response?.status === 429) {
        return m.reply(UI.error(
            'Rate Limited',
            'Too many requests',
            'Wait a few minutes\\nTry again later\\nDon\\'t spam commands'
        ));
    }

    // Not found (404)
    if (error.response?.status === 404) {
        return m.reply(UI.error(
            'Not Found',
            'Resource not available',
            'Check your input\\nTry a different query\\nURL might be invalid'
        ));
    }

    // Unauthorized (401/403)
    if (error.response?.status === 401 || error.response?.status === 403) {
        return m.reply(UI.error(
            'Access Denied',
            'API access forbidden',
            'Service might require authentication\\nTry again later'
        ));
    }

    // Bad request (400)
    if (error.response?.status === 400) {
        return m.reply(UI.error(
            'Bad Request',
            'Invalid request format',
            'Check your input\\nUse correct command format\\nType .help <command>'
        ));
    }

    // Server errors (500+)
    if (error.response?.status >= 500) {
        return m.reply(UI.error(
            'Server Error',
            'External service is down',
            'Try again in a few minutes\\nService may be under maintenance'
        ));
    }

    // Network errors
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED' || error.code === 'ENETUNREACH') {
        return m.reply(UI.error(
            'Network Error',
            'Cannot reach server',
            'Check your internet connection\\nService might be down\\nTry again later'
        ));
    }

    // Validation errors
    if (error.message.includes('validation') || error.name === 'ValidationError') {
        return m.reply(UI.error(
            'Invalid Input',
            error.message,
            'Check command format\\nUse .help <command>\\nProvide valid parameters'
        ));
    }

    // File/media errors
    if (error.message.includes('file') || error.message.includes('media')) {
        return m.reply(UI.error(
            'Media Error',
            error.message || 'Cannot process file',
            'File might be too large\\nFormat not supported\\nTry a different file'
        ));
    }

    // Generic error fallback
    return m.reply(UI.error(
        'Error',
        error.message || 'Something went wrong',
        'Try again\\nUse .help for guidance\\nContact support if issue persists'
    ));
}

/**
 * Wrap async operation with error handling
 * @param {Function} operation - Async function to execute
 * @param {Object} m - Message object
 * @param {string} commandName - Command name
 * @returns {Promise<any>}
 */
export async function safeExecute(operation, m, commandName) {
    try {
        return await operation();
    } catch (error) {
        await errorHandler(error, m, commandName);
        throw error; // Re-throw for logging purposes
    }
}
