/**
 * Reusable message templates for consistent UI/UX
 * Use these throughout all commands for standardized responses
 */

import { UI, Format } from './design.js';

export const Messages = {
    // Success messages
    success: {
        download: (details) => UI.success('Download Complete', {
            'File': details.filename || 'Media file',
            'Size': Format.bytes(details.size || 0),
            'Time': Format.time(details.duration || 0)
        }),

        saved: (type, sender) => UI.success(`${type} Saved`, {
            'From': `@${sender.split('@')[0]}`,
            'Location': 'Saved Messages',
            'Time': new Date().toLocaleTimeString()
        }),

        sticker: () => `✨ *STICKER CREATED* ✨\n\n${UI.badge('Success', 'success')} Your sticker is ready!\n\n${UI.footer()}`,

        generic: (message) => `${UI.BRAND.success} ${message}\n\n${UI.footer()}`
    },

    // Error messages  
    error: {
        noMedia: () => UI.error(
            'No Media Found',
            'Reply to an image, video, or audio message',
            'Send an image\nReply with .sticker\nTry again'
        ),

        noLink: (command) => UI.error(
            'Link Required',
            `Please provide a URL`,
            `Example: ${command} https://...`
        ),

        downloadFailed: (reason) => UI.error(
            'Download Failed',
            reason || 'Unable to download media',
            'Check the URL\nTry a different link\nContact support if persists'
        ),

        noPermission: () => UI.error(
            'Permission Denied',
            'You need admin privileges for this action',
            'Contact group admin\nCheck your role'
        ),

        rateLimited: (wait) => UI.error(
            'Please Wait',
            `Command on cooldown`,
            `Wait ${wait} seconds\nAvoid spam`
        ),

        generic: (message, suggestion = null) => UI.error(
            'Oops!',
            message,
            suggestion
        )
    },

    // Loading states
    loading: {
        download: (platform) => `${UI.BRAND.loading} Downloading from ${platform}...`,
        processing: () => `${UI.BRAND.loading} Processing your request...`,
        searching: (query) => `${UI.BRAND.loading} Searching for "${query}"...`,
        generic: (task) => `${UI.BRAND.loading} ${task}...`
    },

    // Help/Usage messages
    usage: {
        withExample: (command, args, description, examples) => {
            let msg = `${UI.box(`${command.toUpperCase()} COMMAND`)}\n\n`;
            msg += `${UI.syntax(command, args, description)}\n\n`;
            if (examples && examples.length > 0) {
                msg += `${UI.section('EXAMPLES', '✨')}\n`;
                examples.forEach(ex => {
                    msg += `${UI.example(ex.cmd, ex.desc)}\n`;
                });
            }
            msg += `${UI.footer()}`;
            return msg;
        },

        quickGuide: (command, steps) => {
            let msg = `${UI.box(`${command.toUpperCase()}`)}\n\n`;
            msg += `${UI.section('HOW TO USE', '📝')}\n`;
            msg += `${UI.numberedList(steps)}\n`;
            msg += `${UI.footer()}`;
            return msg;
        }
    },

    // Info displays
    info: {
        stats: (title, data) => {
            let msg = `${UI.box(title)}\n\n`;
            msg += `${UI.stats(data)}\n`;
            msg += `${UI.footer()}`;
            return msg;
        },

        list: (title, items, emoji = '📋') => {
            let msg = `${UI.section(title, emoji)}\n`;
            msg += `${UI.list(items)}\n`;
            return msg;
        }
    },

    // Status messages
    status: {
        online: () => `${UI.badge('Online', 'success')} Bot is fully operational`,
        busy: () => `${UI.badge('Processing', 'info')} Please wait...`,
        offline: () => `${UI.badge('Offline', 'error')} Bot is currently down`
    }
};

// Quick access functions
export const showSuccess = (message) => Messages.success.generic(message);
export const showError = (message, suggestion) => Messages.error.generic(message, suggestion);
export const showLoading = (task) => Messages.loading.generic(task);

export default Messages;
