/**
 * Timeout Utility
 * Provides timeout wrappers for long-running operations
 */

/**
 * Wrap a promise with a timeout
 * @param {Promise} promise - Promise to wrap
 * @param {number} timeoutMs - Timeout in milliseconds (default: 30000)
 * @param {string} operation - Operation name for error message
 * @returns {Promise} Promise that rejects if timeout is exceeded
 */
export async function withTimeout(promise, timeoutMs = 30000, operation = 'Operation') {
    return Promise.race([
        promise,
        new Promise((_, reject) =>
            setTimeout(
                () => reject(new Error(`${operation} timed out after ${timeoutMs}ms`)),
                timeoutMs
            )
        )
    ]);
}

/**
 * Create a timeout promise that resolves after given milliseconds
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise<void>}
 */
export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry an operation with timeout
 * @param {Function} operation - Async function to retry
 * @param {number} retries - Number of retries
 * @param {number} timeoutMs - Timeout per attempt
 * @returns {Promise<any>} Result of operation
 */
export async function retryWithTimeout(operation, retries = 3, timeoutMs = 10000) {
    for (let i = 0; i < retries; i++) {
        try {
            return await withTimeout(operation(), timeoutMs, 'Retry operation');
        } catch (error) {
            if (i === retries - 1) throw error;
            await sleep(Math.pow(2, i) * 1000); // Exponential backoff
        }
    }
}
