import path from 'path'
import fs from 'fs/promises'
import { MantraContext, Plugin } from '../types/index.js'
import { logger } from '../utils/logger.js'

export class PluginManager {
    private plugins = new Map<string, Plugin>()
    private commands = new Map<string, Plugin>() // Map command -> Plugin

    constructor() { }

    async loadPlugins() {
        // We will implement recursive loading later if needed, for now flat list
        // Note: In TS/NodeNext connection, dynamic imports need full paths or handled carefully
        // For simplicity in this refactor step, we'll manually register a few or use a glob pattern later
        // But to make it work dynamically:

        const pluginsDir = path.resolve('src/plugins')
        try {
            await fs.mkdir(pluginsDir, { recursive: true })
            const files = await fs.readdir(pluginsDir)

            for (const file of files) {
                if (file.endsWith('.ts') || file.endsWith('.js')) {
                    try {
                        const pluginModule = await import(`file://${path.join(pluginsDir, file)}`)
                        const plugin: Plugin = pluginModule.default

                        if (plugin && plugin.triggers) {
                            plugin.triggers.forEach(trigger => {
                                this.commands.set(trigger.toLowerCase(), plugin)
                            })
                            if (plugin.name) this.plugins.set(plugin.name, plugin)
                        }
                    } catch (err) {
                        logger.error({ err, file }, 'Failed to load plugin')
                    }
                }
            }
            logger.info(`📦 Loaded ${this.commands.size} commands from ${this.plugins.size} plugins`)
        } catch (err) {
            logger.error(err, 'Error accessing plugins directory')
        }
    }

    getPlugin(command: string): Plugin | undefined {
        return this.commands.get(command.toLowerCase())
    }
}
