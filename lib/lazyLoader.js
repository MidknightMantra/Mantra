/**
 * Lazy Plugin Loader
 * Loads plugins on-demand instead of all at startup
 * Improves startup time and memory usage
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import { log } from '../src/utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class LazyPluginLoader {
    constructor() {
        this.loaded = new Set();
        this.pluginPaths = new Map();
        this.discovering = false;
    }

    /**
     * Discover all available plugins without loading them
     */
    async discover() {
        if (this.discovering) {
            return;
        }

        this.discovering = true;
        const pluginFolder = path.join(__dirname, '../plugins');
        const files = fs.readdirSync(pluginFolder).filter(file => file.endsWith('.js'));

        for (const file of files) {
            const pluginPath = path.join(pluginFolder, file);
            const pluginName = file.replace('.js', '');
            this.pluginPaths.set(pluginName, pluginPath);
        }

        log.action('Plugins discovered', 'system', { count: files.length });
        this.discovering = false;
    }

    /**
     * Load a specific plugin by name
     */
    async load(pluginName) {
        if (this.loaded.has(pluginName)) {
            return true; // Already loaded
        }

        const pluginPath = this.pluginPaths.get(pluginName);
        if (!pluginPath) {
            log.error(`Plugin not found: ${pluginName}`, new Error('Plugin not found'));
            return false;
        }

        try {
            await import(`file://${pluginPath}`);
            this.loaded.add(pluginName);
            log.action('Plugin lazy-loaded', 'system', { plugin: pluginName });
            return true;
        } catch (error) {
            log.error(`Failed to lazy-load plugin: ${pluginName}`, error);
            return false;
        }
    }

    /**
     * Load multiple plugins
     */
    async loadMultiple(pluginNames) {
        const results = await Promise.allSettled(
            pluginNames.map(name => this.load(name))
        );
        return results.filter(r => r.status === 'fulfilled').length;
    }

    /**
     * Load all remaining plugins
     */
    async loadAll() {
        const unloaded = Array.from(this.pluginPaths.keys())
            .filter(name => !this.loaded.has(name));

        if (unloaded.length === 0) {
            return 0;
        }

        console.log(chalk.hex('#6A0DAD')(`📦 Lazy-loading ${unloaded.length} remaining plugins...`));
        return await this.loadMultiple(unloaded);
    }

    /**
     * Get stats
     */
    getStats() {
        return {
            discovered: this.pluginPaths.size,
            loaded: this.loaded.size,
            pending: this.pluginPaths.size - this.loaded.size
        };
    }
}

// Singleton instance
export const lazyLoader = new LazyPluginLoader();
export default lazyLoader;
