const fs = require('fs');
const path = require('path');

class PluginManager {
    constructor(folder) {
        this.plugins = new Map();
        this.pluginFiles = new Map();
        this.fileSignatures = new Map();
        this.folder = path.resolve(folder);
        this.watcher = null;

        this.load();
        this.watch();
    }

    load() {
        const files = fs.readdirSync(this.folder).filter((f) => f.endsWith('.js'));

        for (const file of files) {
            this.loadPlugin(file);
        }

        console.log(`Total plugins: ${this.plugins.size} commands from ${this.pluginFiles.size} files`);
    }

    loadPlugin(file) {
        const fullPath = path.join(this.folder, file);
        if (!fs.existsSync(fullPath)) return;

        let signature = null;
        try {
            const stat = fs.statSync(fullPath);
            signature = `${stat.size}:${stat.mtimeMs}`;
        } catch {}

        if (signature && this.fileSignatures.get(file) === signature) {
            return;
        }

        try {
            delete require.cache[require.resolve(fullPath)];
        } catch {}

        try {
            const plugin = require(fullPath);
            if (!plugin || !plugin.name) return;

            this.unloadPlugin(file, true);

            this.plugins.set(plugin.name.toLowerCase(), plugin);

            if (Array.isArray(plugin.aliases)) {
                for (const alias of plugin.aliases) {
                    this.plugins.set(String(alias).toLowerCase(), plugin);
                }
            }

            this.pluginFiles.set(file, plugin);
            if (signature) {
                this.fileSignatures.set(file, signature);
            }
            console.log(`Loaded plugin: ${plugin.name}`);
        } catch (err) {
            if (signature) {
                this.fileSignatures.set(file, signature);
            }
            console.error(`Failed to load plugin ${file}:`, err.message);
        }
    }

    unloadPlugin(file, silent = false) {
        const plugin = this.pluginFiles.get(file);
        if (!plugin) return;

        for (const [command, cmdPlugin] of this.plugins.entries()) {
            if (cmdPlugin === plugin) {
                this.plugins.delete(command);
            }
        }

        this.pluginFiles.delete(file);

        if (!silent) {
            console.log(`Unloaded plugin: ${file}`);
        }
    }

    reloadPlugin(file) {
        const fullPath = path.join(this.folder, file);

        if (!fs.existsSync(fullPath)) {
            this.unloadPlugin(file);
            this.fileSignatures.delete(file);
            return;
        }

        this.loadPlugin(file);
    }

    watch() {
        if (this.watcher) return;

        const debounceMap = new Map();

        this.watcher = fs.watch(this.folder, (_eventType, filename) => {
            if (!filename) return;

            const file = String(filename);
            if (!file.endsWith('.js')) return;

            if (debounceMap.has(file)) {
                clearTimeout(debounceMap.get(file));
            }

            debounceMap.set(file, setTimeout(() => {
                debounceMap.delete(file);
                this.reloadPlugin(file);
            }, 350));
        });

        this.watcher.on('error', (err) => {
            console.error('Hot reload watcher error:', err.message);
        });

        console.log('Hot reload enabled for plugins');
    }

    close() {
        if (this.watcher) {
            this.watcher.close();
            this.watcher = null;
        }
    }

    getCommand(name) {
        return this.plugins.get(name.toLowerCase());
    }

    async runOnMessage(sock, m, mantra) {
        for (const plugin of new Set(this.plugins.values())) {
            if (plugin.onMessage) {
                await plugin.onMessage(sock, m, mantra);
            }
        }
    }

    async runOnUpdate(sock, updates, mantra) {
        for (const plugin of new Set(this.plugins.values())) {
            if (plugin.onMessageUpdate) {
                await plugin.onMessageUpdate(sock, updates, mantra);
            }
        }
    }
}

module.exports = PluginManager;
