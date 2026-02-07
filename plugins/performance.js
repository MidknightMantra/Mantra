import { addCommand } from '../lib/plugins.js';
import { UI } from '../src/utils/design.js';
import { log } from '../src/utils/logger.js';
import { getCommandStats, getSystemMetrics, formatDuration } from '../src/utils/performance.js';
import { cache } from '../lib/redis.js';

addCommand({
    pattern: 'performance',
    alias: ['perf', 'stats', 'metrics'],
    category: 'owner',
    desc: 'View performance metrics and command statistics',
    handler: async (m, { conn, args, isOwner }) => {
        if (!isOwner) {
            return m.reply(UI.error('Owner Only', 'This command is for bot owners', 'Ask the bot owner for performance stats'));
        }

        try {
            await conn.sendMessage(m.chat, { react: { text: '📊', key: m.key } });

            const command = args[0];

            if (command) {
                // Show stats for specific command
                const stats = await getCommandStats(command, 7);

                if (!stats || stats.totalExecutions === 0) {
                    return m.reply(UI.error('No Data', `No performance data for command "${command}"`, 'Command may not have been used recently\\nCheck command name spelling'));
                }

                let msg = `📊 *Performance Stats: ${command}*\n${global.divider}\n\n`;
                msg += `📈 *Overview (7 days)*\n`;
                msg += `• Total Executions: ${stats.totalExecutions}\n`;
                msg += `• Success Rate: ${stats.successRate}%\n`;
                msg += `• Failures: ${stats.failures}\n\n`;

                msg += `⏱️ *Response Times*\n`;
                msg += `• Average: ${formatDuration(stats.avgTime)}\n`;
                msg += `• Fastest: ${formatDuration(stats.minTime)}\n`;
                msg += `• Slowest: ${formatDuration(stats.maxTime)}\n\n`;

                msg += `📅 *Daily Breakdown*\n`;
                const sortedDays = Object.entries(stats.dailyStats)
                    .sort(([a], [b]) => b.localeCompare(a))
                    .slice(0, 5);

                for (const [date, dayStats] of sortedDays) {
                    msg += `• ${date}: ${dayStats.count} calls, ${formatDuration(dayStats.avgTime)} avg\n`;
                }

                msg += `\n${global.divider}`;
                await m.reply(msg);

            } else {
                // Show system metrics
                const metrics = await getSystemMetrics();
                const redisStats = await cache.stats();

                let msg = `📊 *System Performance*\n${global.divider}\n\n`;

                msg += `⚡ *System Status*\n`;
                msg += `• Uptime: ${formatDuration(metrics.uptime * 1000)}\n`;
                msg += `• Memory: ${metrics.memory.used}MB / ${metrics.memory.total}MB\n`;
                msg += `• RSS: ${metrics.memory.rss}MB\n\n`;

                msg += `💾 *Redis Cache*\n`;
                if (redisStats.enabled && redisStats.connected) {
                    msg += `• Status: ✅ Connected\n`;
                    msg += `• Host: ${redisStats.host}:${redisStats.port}\n`;
                } else if (redisStats.enabled) {
                    msg += `• Status: ❌ Disconnected\n`;
                } else {
                    msg += `• Status: ⚠️ Not Configured\n`;
                }
                msg += `\n`;

                msg += `💡 *Usage Tips*\n`;
                msg += `• View specific command: \`.perf <command>\`\n`;
                msg += `• Example: \`.perf ai\`\n`;
                msg += `• Example: \`.perf yt-song\`\n\n`;

                msg += `${global.divider}`;
                await m.reply(msg);
            }

            await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

        } catch (error) {
            log.error('Performance command failed', error, { command: 'performance', user: m.sender });
            await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
            m.reply(UI.error('Failed to Get Stats', error.message || 'Could not retrieve performance metrics', 'Try again later\\nCheck if Redis is running'));
        }
    }
});
