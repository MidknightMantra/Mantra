/**
 * Mantra Design System
 * Beautiful, consistent UI/UX for all bot interactions
 */

export const UI = {
    // Brand Identity
    BRAND: {
        primary: '🔮',
        success: '✅',
        warning: '⚠️',
        error: '❌',
        info: '💡',
        loading: '⏳',
        star: '⭐',
        fire: '🔥',
        crystal: '💎'
    },

    // Visual Dividers
    DIVIDER: {
        light: '━━━━━━━━━━━━━━',
        heavy: '═══════════════',
        dots: '・・・・・・・・・',
        wave: '〰〰〰〰〰',
        line: '─────────────'
    },

    // Bullet Styles
    BULLETS: {
        primary: '▸',
        secondary: '•',
        check: '✓',
        arrow: '→',
        diamond: '◆',
        star: '⭐'
    },

    // Text Formatting
    format: {
        header: (text) => `✧ *${text}* ✧`,
        subheader: (text) => `◆ *${text}*`,
        bold: (text) => `*${text}*`,
        italic: (text) => `_${text}_`,
        code: (text) => `\`${text}\``,
        codeBlock: (text, lang = '') => `\`\`\`${lang}\n${text}\n\`\`\``,
        quote: (text) => `> ${text}`,
        monospace: (text) => `\`\`\`${text}\`\`\``
    },

    // Card Layouts
    card: (title, content, footer = null) => {
        let msg = `╭─「 ${title} 」\n`;
        const lines = content.split('\n');
        lines.forEach(line => {
            msg += `│ ${line}\n`;
        });
        if (footer) {
            msg += `╰─ ${footer}`;
        } else {
            msg += `╰─────────────`;
        }
        return msg;
    },

    // Simple Box
    box: (title) => {
        const len = title.length + 8;
        const border = '═'.repeat(len);
        return `╔${border}╗\n║  ${title}  ║\n╚${border}╝`;
    },

    // Lists
    list: (items, style = 'primary') => {
        return items.map(item =>
            `${UI.BULLETS[style]} ${item}`
        ).join('\n');
    },

    // Numbered List
    numberedList: (items) => {
        return items.map((item, i) =>
            `${i + 1}. ${item}`
        ).join('\n');
    },

    // Progress Bar
    progress: (percent, width = 10) => {
        const filled = Math.floor((percent / 100) * width);
        const empty = width - filled;
        return '█'.repeat(filled) + '░'.repeat(empty) + ` ${percent}%`;
    },

    // Status Badge
    badge: (text, type = 'info') => {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️',
            premium: '⭐',
            pro: '💎',
            new: '🆕',
            hot: '🔥'
        };
        return `${icons[type] || icons.info} ${text}`;
    },

    // Section Header
    section: (title, emoji = '📌') => {
        return `\n${emoji} *${title.toUpperCase()}*\n${UI.DIVIDER.light}\n`;
    },

    // Info Block
    infoBlock: (items) => {
        return items.map(([label, value]) =>
            `✦ *${label}:* ${value}`
        ).join('\n');
    },

    // Command Syntax
    syntax: (command, args = '', description = '') => {
        let msg = `📝 *Syntax:* \`${command}`;
        if (args) msg += ` ${args}`;
        msg += '`';
        if (description) msg += `\n💡 ${description}`;
        return msg;
    },

    // Example Block
    example: (command, description) => {
        return `✦ \`${command}\`\n   ${description}`;
    },

    // Error Message
    error: (title, message, suggestion = null) => {
        let msg = `${UI.BRAND.error} *${title}*\n\n`;
        msg += `🔍 *What happened:*\n  ${message}\n`;
        if (suggestion) {
            msg += `\n💡 *Try this:*\n${UI.list(suggestion.split('\n'), 'secondary')}`;
        }
        msg += `\n\n${UI.DIVIDER.light}\nType .help for assistance`;
        return msg;
    },

    // Success Message
    success: (title, details = {}) => {
        let msg = `✨ *SUCCESS* ✨\n\n`;
        msg += `${UI.BRAND.success} ${title}\n\n`;
        if (Object.keys(details).length > 0) {
            msg += UI.infoBlock(Object.entries(details)) + '\n';
        }
        msg += `\n${UI.DIVIDER.light}\n⚡ Powered by Mantra`;
        return msg;
    },

    // Loading Message
    loading: (task) => {
        return `${UI.BRAND.loading} ${task}...`;
    },

    // Stats Display
    stats: (data) => {
        return Object.entries(data).map(([key, value]) => {
            const icon = {
                speed: '⚡',
                memory: '💾',
                uptime: '⏰',
                commands: '📊',
                users: '👥',
                groups: '👥'
            }[key.toLowerCase()] || '📌';
            return `${icon} *${key}:* ${value}`;
        }).join('\n');
    },

    // Feature List
    features: (items) => {
        return items.map(item => `✓ ${item}`).join('\n');
    },

    // Menu Category
    category: (name, emoji, count) => {
        return `\n${emoji} *${name}* (${count})\n${UI.DIVIDER.dots}`;
    },

    // Footer
    footer: (text = 'Mantra: The path of minimalist power') => {
        return `\n${UI.DIVIDER.light}\n🕯️ ${text}`;
    }
};

// Advanced Formatters
export const Format = {
    // Time formatting
    time: (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);

        if (h > 0) return `${h}h ${m}m`;
        if (m > 0) return `${m}m ${s}s`;
        return `${s}s`;
    },

    // File size
    bytes: (bytes) => {
        const sizes = ['B', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 B';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    },

    // Number with commas
    number: (num) => {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    },

    // Percentage
    percent: (value, total) => {
        return Math.round((value / total) * 100) + '%';
    }
};

export default { UI, Format };
