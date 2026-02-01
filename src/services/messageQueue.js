import { log } from '../utils/logger.js';

/**
 * Message Queue for handling high-traffic scenarios
 * Prevents overwhelming the bot with too many simultaneous requests
 */
class MessageQueue {
    constructor(concurrency = 10) {
        this.queue = [];
        this.running = 0;
        this.concurrency = concurrency;
    }

    /**
     * Add task to queue
     */
    async add(task) {
        return new Promise((resolve, reject) => {
            this.queue.push({
                task,
                resolve,
                reject
            });

            this.process();
        });
    }

    /**
     * Process queue
     */
    async process() {
        if (this.running >= this.concurrency || this.queue.length === 0) {
            return;
        }

        this.running++;
        const { task, resolve, reject } = this.queue.shift();

        try {
            const result = await task();
            resolve(result);
        } catch (error) {
            log.error('Queue task failed', error);
            reject(error);
        } finally {
            this.running--;
            this.process(); // Process next item
        }
    }

    /**
     * Get queue stats
     */
    getStats() {
        return {
            queued: this.queue.length,
            running: this.running,
            concurrency: this.concurrency
        };
    }

    /**
     * Clear queue
     */
    clear() {
        this.queue = [];
        log.action('Queue cleared', 'system');
    }
}

// Singleton instance
export const messageQueue = new MessageQueue(10);
export default messageQueue;
