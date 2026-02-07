/**
 * API Helper Utility
 * Provides retry logic and graceful degradation for API calls
 */

import axios from 'axios';
import { log } from './logger.js';

/**
 * Make an API call with automatic retry logic
 * @param {string} url - API endpoint URL
 * @param {Object} options - Axios options
 * @param {number} retries - Number of retry attempts (default: 3)
 * @returns {Promise<any>} API response data
 */
export async function apiCall(url, options = {}, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const response = await axios.get(url, {
                timeout: options.timeout || 10000,
                ...options
            });

            return response.data;
        } catch (error) {
            const isLastAttempt = attempt === retries;

            log.warn(`API call failed (attempt ${attempt}/${retries})`, {
                url,
                error: error.message,
                status: error.response?.status
            });

            if (isLastAttempt) {
                throw error;
            }

            // Exponential backoff: 1s, 2s, 4s
            const backoffMs = Math.pow(2, attempt - 1) * 1000;
            await new Promise(resolve => setTimeout(resolve, backoffMs));
        }
    }
}

/**
 * Make a POST API call with retry logic
 * @param {string} url - API endpoint URL
 * @param {any} data - Request body
 * @param {Object} options - Axios options
 * @param {number} retries - Number of retry attempts
 * @returns {Promise<any>} API response data
 */
export async function apiPost(url, data, options = {}, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const response = await axios.post(url, data, {
                timeout: options.timeout || 10000,
                ...options
            });

            return response.data;
        } catch (error) {
            const isLastAttempt = attempt === retries;

            log.warn(`API POST failed (attempt ${attempt}/${retries})`, {
                url,
                error: error.message,
                status: error.response?.status
            });

            if (isLastAttempt) {
                throw error;
            }

            const backoffMs = Math.pow(2, attempt - 1) * 1000;
            await new Promise(resolve => setTimeout(resolve, backoffMs));
        }
    }
}

/**
 * Fetch with timeout and error handling
 * @param {string} url - URL to fetch
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Promise<any>} Response data
 */
export async function fetchWithTimeout(url, timeoutMs = 10000) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await axios.get(url, {
            signal: controller.signal,
            timeout: timeoutMs
        });
        return response.data;
    } finally {
        clearTimeout(timeout);
    }
}/**
 * Fetch a buffer from a URL
 * @param {string} url - Target URL
 * @param {Object} options - Axios options
 * @returns {Promise<Buffer>}
 */
export async function fetchBuffer(url, options = {}) {
    try {
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            ...options
        });
        return Buffer.from(response.data);
    } catch (e) {
        log.error(`fetchBuffer failed for ${url}`, e);
        throw e;
    }
}

export default {
    apiCall,
    apiPost,
    fetchWithTimeout,
    fetchBuffer
};
