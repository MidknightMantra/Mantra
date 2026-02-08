import { addCommand } from '../lib/plugins.js';
import { log } from '../src/utils/logger.js';
import {
    getSetting,
    setSetting,
    resetSetting,
    resetAllSettings,
    getAllSettings,
    getGroupSetting,
    setGroupSetting,
    getAllGroupSettings,
    resetAllGroupSettings,
    getEnabledGroupSettings,
    getSudoNumbers,
    clearAllSudo,
    getAllUsersNotes,
    deleteNoteById,
    updateNoteById,
    deleteAllNotes,
    getBadWords,
    addBadWord,
    removeBadWord,
    clearBadWords,
    initializeDefaultBadWords,
    DEFAULT_BAD_WORDS
} from '../lib/database.js';

/**
 * UTILITIES
 */
function parseBooleanInput(input) {
    if (!input) return null;
    const val = input.toLowerCase().trim();
    if (val === "on") return "true";
    if (val === "off") return "false";
    return val;
}

function formatBoolDisplay(val) {
    return val === "true" ? "ON" : "OFF";
}

async function formatGroupsWithNames(jids, conn) {
    if (!jids || jids.length === 0) return "None";

    const groupInfos = await Promise.all(
        jids.map(async (jid) => {
            try {
                const metadata = await conn.groupMetadata(jid);
                const name = metadata?.subject || "Unknown";
                return `• ${name}`;
            } catch (e) {
                return `• ${jid}`;
            }
        })
    );
    return groupInfos.join("\n");
}

/**
 * SETTINGS OVERVIEW
 */
addCommand({
    pattern: 'settings',
    alias: ["botsettings", "allsettings"],
    react: "⚙️",
    category: "owner",
    desc: "View all bot settings",
    handler: async (m, { conn, isOwner }) => {
        if (!isOwner) return m.reply(global.messages.owner);

        try {
            const settings = await getAllSettings();
            const sudoList = await getSudoNumbers();
            const enabledGroupSettings = await getEnabledGroupSettings();

            let msg = `╭━━━━━━━━━━━╮\n`;
            msg += `│   *⚙️ BOT SETTINGS*\n`;
            msg += `╰━━━━━━━━━━━╯\n\n`;

            const keys = Object.keys(settings).sort();
            for (const key of keys) {
                const val = typeof settings[key] === 'string' ? settings[key] : JSON.stringify(settings[key]);
                const displayVal = val.length > 40 ? val.substring(0, 40) + "..." : val;
                msg += `▸ *${key}:* ${displayVal}\n`;
            }

            msg += `\n▸ *SUDO_USERS:* ${sudoList.length > 0 ? sudoList.join(", ") : "None"}\n`;

            msg += `\n╭━━━━━━━━━━━╮\n`;
            msg += `│   *📋 GROUP SETTINGS*\n`;
            msg += `╰━━━━━━━━━━━╯\n\n`;

            const [
                welcomeGroups,
                goodbyeGroups,
                eventsGroups,
                antilinkGroups,
                antibadGroups,
                antigroupmentionGroups,
            ] = await Promise.all([
                formatGroupsWithNames(enabledGroupSettings.WELCOME_MESSAGE, conn),
                formatGroupsWithNames(enabledGroupSettings.GOODBYE_MESSAGE, conn),
                formatGroupsWithNames(enabledGroupSettings.GROUP_EVENTS, conn),
                formatGroupsWithNames(enabledGroupSettings.ANTILINK, conn),
                formatGroupsWithNames(enabledGroupSettings.ANTIBAD, conn),
                formatGroupsWithNames(enabledGroupSettings.ANTIGROUPMENTION, conn),
            ]);

            msg += `*🎉 WELCOME MESSAGE:*\n${welcomeGroups}\n\n`;
            msg += `*👋 GOODBYE MESSAGE:*\n${goodbyeGroups}\n\n`;
            msg += `*📢 GROUP EVENTS:*\n${eventsGroups}\n\n`;
            msg += `*🔗 ANTILINK:*\n${antilinkGroups}\n\n`;
            msg += `*🚫 ANTIBAD:*\n${antibadGroups}\n\n`;
            // msg += `*🛡️ ANTI-GROUP-MENTION:*\n${antigroupmentionGroups}\n`;

            m.reply(msg);
        } catch (error) {
            log.error("settings error:", error);
            m.reply(`❌ Error: ${error.message}`);
        }
    }
});

/**
 * BOT IDENTITY SETTINGS
 */
addCommand({
    pattern: 'setprefix',
    alias: ["prefix", "botprefix", "changeprefix"],
    react: "⚙️",
    category: "owner",
    desc: "Set bot prefix",
    handler: async (m, { text, isOwner }) => {
        if (!isOwner) return m.reply(global.messages.owner);
        if (!text) return m.reply("❌ Please provide a prefix!\nExample: .setprefix !");

        const current = await getSetting("PREFIX");
        if (current === text.trim()) return m.reply(`⚠️ Prefix is already set to: *${text.trim()}*`);

        await setSetting("PREFIX", text.trim());
        m.reply(`✅ Prefix set to: *${text.trim()}*`);
    }
});

addCommand({
    pattern: 'setbotname',
    alias: ["botname", "namebot", "changename"],
    react: "⚙️",
    category: "owner",
    desc: "Set bot name",
    handler: async (m, { text, isOwner }) => {
        if (!isOwner) return m.reply(global.messages.owner);
        if (!text) return m.reply("❌ Please provide a bot name!");

        const current = await getSetting("BOT_NAME");
        if (current === text.trim()) return m.reply(`⚠️ Bot name is already set to: *${text.trim()}*`);

        await setSetting("BOT_NAME", text.trim());
        m.reply(`✅ Bot name set to: *${text.trim()}*`);
    }
});

addCommand({
    pattern: 'setownername',
    alias: ["ownername", "myname"],
    react: "⚙️",
    category: "owner",
    desc: "Set owner name",
    handler: async (m, { text, isOwner }) => {
        if (!isOwner) return m.reply(global.messages.owner);
        if (!text) return m.reply("❌ Please provide an owner name!");

        const current = await getSetting("OWNER_NAME");
        if (current === text.trim()) return m.reply(`⚠️ Owner name is already set to: *${text.trim()}*`);

        await setSetting("OWNER_NAME", text.trim());
        m.reply(`✅ Owner name set to: *${text.trim()}*`);
    }
});

addCommand({
    pattern: 'setownernumber',
    alias: ["ownernumber", "ownernum", "mynumber"],
    react: "⚙️",
    category: "owner",
    desc: "Set owner number",
    handler: async (m, { text, isOwner }) => {
        if (!isOwner) return m.reply(global.messages.owner);
        if (!text) return m.reply("❌ Please provide an owner number!");

        const num = text.replace(/\D/g, "");
        const current = await getSetting("OWNER_NUMBER");
        if (current === num) return m.reply(`⚠️ Owner number is already set to: *${num}*`);

        await setSetting("OWNER_NUMBER", num);
        m.reply(`✅ Owner number set to: *${num}*`);
    }
});

addCommand({
    pattern: 'setfooter',
    alias: ["footer", "botfooter"],
    react: "⚙️",
    category: "owner",
    desc: "Set bot footer",
    handler: async (m, { text, isOwner }) => {
        if (!isOwner) return m.reply(global.messages.owner);
        if (!text) return m.reply("❌ Please provide a footer text!");

        const current = await getSetting("FOOTER");
        if (current === text.trim()) return m.reply(`⚠️ Footer is already set to: *${text.trim()}*`);

        await setSetting("FOOTER", text.trim());
        m.reply(`✅ Footer set to: *${text.trim()}*`);
    }
});

addCommand({
    pattern: 'setcaption',
    alias: ["caption", "botcaption"],
    react: "⚙️",
    category: "owner",
    desc: "Set bot caption",
    handler: async (m, { text, isOwner }) => {
        if (!isOwner) return m.reply(global.messages.owner);
        if (!text) return m.reply("❌ Please provide a caption!");

        const current = await getSetting("CAPTION");
        if (current === text.trim()) return m.reply(`⚠️ Caption is already set to: *${text.trim()}*`);

        await setSetting("CAPTION", text.trim());
        m.reply(`✅ Caption set to: *${text.trim()}*`);
    }
});

addCommand({
    pattern: 'setbotpic',
    alias: ["botpic", "botimage", "setbotimage"],
    react: "⚙️",
    category: "owner",
    desc: "Set bot picture URL",
    handler: async (m, { text, isOwner }) => {
        if (!isOwner) return m.reply(global.messages.owner);
        if (!text) return m.reply("❌ Please provide an image URL!");

        const current = await getSetting("BOT_PIC");
        if (current === text.trim()) return m.reply(`⚠️ Bot picture URL is already set to this value!`);

        await setSetting("BOT_PIC", text.trim());
        m.reply(`✅ Bot picture URL updated!`);
    }
});

addCommand({
    pattern: 'setmode',
    alias: ["mode", "botmode", "changemode"],
    react: "⚙️",
    category: "owner",
    desc: "Set bot mode (public/private)",
    handler: async (m, { text, isOwner }) => {
        if (!isOwner) return m.reply(global.messages.owner);
        const mode = text?.toLowerCase().trim();
        if (!mode || !["public", "private"].includes(mode)) {
            return m.reply("❌ Please specify: public or private");
        }

        const current = await getSetting("MODE");
        if (current === mode) return m.reply(`⚠️ Bot mode is already set to: *${mode}*`);

        await setSetting("MODE", mode);
        m.reply(`✅ Bot mode set to: *${mode}*`);
    }
});

addCommand({
    pattern: 'settimezone',
    alias: ["timezone", "tz", "settz"],
    react: "⚙️",
    category: "owner",
    desc: "Set bot timezone",
    handler: async (m, { text, isOwner }) => {
        if (!isOwner) return m.reply(global.messages.owner);
        if (!text) return m.reply("❌ Please provide a timezone!\nExample: .settimezone Africa/Nairobi");

        const current = await getSetting("TIME_ZONE");
        if (current === text.trim()) return m.reply(`⚠️ Timezone is already set to: *${text.trim()}*`);

        await setSetting("TIME_ZONE", text.trim());
        m.reply(`✅ Timezone set to: *${text.trim()}*`);
    }
});

/**
 * PRESENCE & BEHAVIOR
 */
addCommand({
    pattern: 'setdmpresence',
    alias: ["dmpresence", "chatpresence", "inboxpresence"],
    react: "⚙️",
    category: "owner",
    desc: "Set DM presence",
    handler: async (m, { text, isOwner }) => {
        if (!isOwner) return m.reply(global.messages.owner);
        const valid = ["online", "offline", "typing", "recording"];
        if (!text || !valid.includes(text.toLowerCase())) return m.reply(`❌ Please specify: ${valid.join(", ")}`);

        const current = await getSetting("DM_PRESENCE");
        if (current === text.toLowerCase()) return m.reply(`⚠️ DM presence is already set to: *${text.toLowerCase()}*`);

        await setSetting("DM_PRESENCE", text.toLowerCase());
        m.reply(`✅ DM presence set to: *${text.toLowerCase()}*`);
    }
});

addCommand({
    pattern: 'setgcpresence',
    alias: ["gcpresence", "grouppresence", "grppresence"],
    react: "⚙️",
    category: "owner",
    desc: "Set group presence",
    handler: async (m, { text, isOwner }) => {
        if (!isOwner) return m.reply(global.messages.owner);
        const valid = ["online", "offline", "typing", "recording"];
        if (!text || !valid.includes(text.toLowerCase())) return m.reply(`❌ Please specify: ${valid.join(", ")}`);

        const current = await getSetting("GC_PRESENCE");
        if (current === text.toLowerCase()) return m.reply(`⚠️ Group presence is already set to: *${text.toLowerCase()}*`);

        await setSetting("GC_PRESENCE", text.toLowerCase());
        m.reply(`✅ Group presence set to: *${text.toLowerCase()}*`);
    }
});

addCommand({
    pattern: 'setchatbot',
    alias: ["chatbot", "ai", "setai"],
    react: "⚙️",
    category: "owner",
    desc: "Set chatbot (on/off/audio)",
    handler: async (m, { text, isOwner }) => {
        if (!isOwner) return m.reply(global.messages.owner);
        const valid = ["true", "false", "audio"];
        const value = parseBooleanInput(text);

        if (!value || !valid.includes(value)) return m.reply(`❌ Please specify: on, off, or audio`);

        const current = await getSetting("CHATBOT");
        if (current === value) {
            const display = value === "true" ? "ON" : value === "false" ? "OFF" : value;
            return m.reply(`⚠️ Chatbot is already set to: *${display}*`);
        }

        await setSetting("CHATBOT", value);
        m.reply(`✅ Chatbot set to: *${value === "true" ? "ON" : value === "false" ? "OFF" : value}*`);
    }
});

addCommand({
    pattern: 'setchatbotmode',
    alias: ["chatbotmode", "aimode"],
    react: "⚙️",
    category: "owner",
    desc: "Set chatbot mode",
    handler: async (m, { text, isOwner }) => {
        if (!isOwner) return m.reply(global.messages.owner);
        const valid = ["inbox", "groups", "allchats"];
        if (!text || !valid.includes(text.toLowerCase())) return m.reply(`❌ Please specify: ${valid.join(", ")}`);

        const current = await getSetting("CHATBOT_MODE");
        if (current === text.toLowerCase()) return m.reply(`⚠️ Chatbot mode is already set to: *${text.toLowerCase()}*`);

        await setSetting("CHATBOT_MODE", text.toLowerCase());
        m.reply(`✅ Chatbot mode set to: *${text.toLowerCase()}*`);
    }
});

addCommand({
    pattern: 'setstartmsg',
    alias: ["startmsg", "startingmessage", "startmessage"],
    react: "⚙️",
    category: "owner",
    desc: "Set starting message",
    handler: async (m, { text, isOwner }) => {
        if (!isOwner) return m.reply(global.messages.owner);
        const valid = ["true", "false"];
        const value = parseBooleanInput(text);
        if (!value || !valid.includes(value)) return m.reply(`❌ Please specify: on or off`);

        const current = await getSetting("STARTING_MESSAGE");
        if (current === value) return m.reply(`⚠️ Starting message is already: *${formatBoolDisplay(value)}*`);

        await setSetting("STARTING_MESSAGE", value);
        m.reply(`✅ Starting message set to: *${formatBoolDisplay(value)}*`);
    }
});

addCommand({
    pattern: 'setantidelete',
    alias: ["antidelete", "antidel"],
    react: "⚙️",
    category: "owner",
    desc: "Set antidelete",
    handler: async (m, { text, isOwner }) => {
        if (!isOwner) return m.reply(global.messages.owner);
        const valid = ["inchat", "indm", "false"];
        const value = parseBooleanInput(text);
        if (!value || !valid.includes(value)) return m.reply(`❌ Please specify: inchat, indm or off`);

        const current = await getSetting("ANTIDELETE");
        if (current === value) {
            const displayVal = value === "false" ? "OFF" : value.toUpperCase();
            return m.reply(`⚠️ Antidelete is already set to: *${displayVal}*`);
        }

        await setSetting("ANTIDELETE", value);
        const displayVal = value === "false" ? "OFF" : value.toUpperCase();
        m.reply(`✅ Antidelete set to: *${displayVal}*`);
    }
});

addCommand({
    pattern: 'setanticall',
    alias: ["anticall", "blockcall"],
    react: "⚙️",
    category: "owner",
    desc: "Set anticall",
    handler: async (m, { text, isOwner }) => {
        if (!isOwner) return m.reply(global.messages.owner);
        const valid = ["true", "block", "false", "decline"];
        const value = parseBooleanInput(text);
        if (!value || !valid.includes(value)) return m.reply(`❌ Please specify: on, off, block or decline`);

        const current = await getSetting("ANTICALL");
        if (current === value) {
            const displayVal = value === "true" ? "ON" : value === "false" ? "OFF" : value.toUpperCase();
            return m.reply(`⚠️ Anticall is already set to: *${displayVal}*`);
        }

        await setSetting("ANTICALL", value);
        const displayVal = value === "true" ? "ON" : value === "false" ? "OFF" : value.toUpperCase();
        m.reply(`✅ Anticall set to: *${displayVal}*`);
    }
});

/**
 * GROUP COMMANDS
 */
addCommand({
    pattern: 'setwelcome',
    alias: ["welcome", "welcomemsg"],
    react: "⚙️",
    category: "group",
    desc: "Set welcome message status",
    handler: async (m, { text, isGroup, isAdmin, isOwner }) => {
        if (!isGroup) return m.reply(global.messages.group);
        if (!isAdmin && !isOwner) return m.reply(global.messages.admin);

        const valid = ["true", "false"];
        const value = parseBooleanInput(text);
        if (!value || !valid.includes(value)) return m.reply(`❌ Please specify: on or off`);

        const current = await getGroupSetting(m.chat, "WELCOME_MESSAGE");
        if (current === value) return m.reply(`⚠️ Welcome message is already: *${formatBoolDisplay(value)}*`);

        await setGroupSetting(m.chat, "WELCOME_MESSAGE", value);
        m.reply(`✅ Welcome message: *${formatBoolDisplay(value)}*`);
    }
});

addCommand({
    pattern: 'setgoodbye',
    alias: ["goodbye", "goodbyemsg", "bye"],
    react: "⚙️",
    category: "group",
    desc: "Set goodbye message status",
    handler: async (m, { text, isGroup, isAdmin, isOwner }) => {
        if (!isGroup) return m.reply(global.messages.group);
        if (!isAdmin && !isOwner) return m.reply(global.messages.admin);

        const valid = ["true", "false"];
        const value = parseBooleanInput(text);
        if (!value || !valid.includes(value)) return m.reply(`❌ Please specify: on or off`);

        const current = await getGroupSetting(m.chat, "GOODBYE_MESSAGE");
        if (current === value) return m.reply(`⚠️ Goodbye message is already: *${formatBoolDisplay(value)}*`);

        await setGroupSetting(m.chat, "GOODBYE_MESSAGE", value);
        m.reply(`✅ Goodbye message: *${formatBoolDisplay(value)}*`);
    }
});

addCommand({
    pattern: 'welcomemessage',
    alias: ["setwelcomemsg", "setwelcometext"],
    react: "⚙️",
    category: "group",
    desc: "Set custom welcome text",
    handler: async (m, { text, isGroup, isAdmin, isOwner }) => {
        if (!isGroup) return m.reply(global.messages.group);
        if (!isAdmin && !isOwner) return m.reply(global.messages.admin);

        if (!text || !text.trim()) {
            const current = await getGroupSetting(m.chat, "WELCOME_MESSAGE_TEXT");
            if (current && current.trim()) {
                return m.reply(`📝 Current welcome message:\n\n${current}\n\nTo change: .welcomemessage <text>\nTo clear: .welcomemessage clear`);
            }
            return m.reply(`❌ Provide a message.\nExample: .welcomemessage Welcome to the group!`);
        }

        if (text.toLowerCase().trim() === "clear") {
            await setGroupSetting(m.chat, "WELCOME_MESSAGE_TEXT", "");
            return m.reply("✅ Custom welcome message cleared.");
        }

        await setGroupSetting(m.chat, "WELCOME_MESSAGE_TEXT", text.trim());
        m.reply(`✅ Welcome message updated.`);
    }
});

addCommand({
    pattern: 'goodbyemessage',
    alias: ["setgoodbyemsg", "setgoodbyetext"],
    react: "⚙️",
    category: "group",
    desc: "Set custom goodbye text",
    handler: async (m, { text, isGroup, isAdmin, isOwner }) => {
        if (!isGroup) return m.reply(global.messages.group);
        if (!isAdmin && !isOwner) return m.reply(global.messages.admin);

        if (!text || !text.trim()) {
            const current = await getGroupSetting(m.chat, "GOODBYE_MESSAGE_TEXT");
            if (current && current.trim()) {
                return m.reply(`📝 Current goodbye message:\n\n${current}\n\nTo change: .goodbyemessage <text>\nTo clear: .goodbyemessage clear`);
            }
            return m.reply(`❌ Provide a message.\nExample: .goodbyemessage Goodbye!`);
        }

        if (text.toLowerCase().trim() === "clear") {
            await setGroupSetting(m.chat, "GOODBYE_MESSAGE_TEXT", "");
            return m.reply("✅ Custom goodbye message cleared.");
        }

        await setGroupSetting(m.chat, "GOODBYE_MESSAGE_TEXT", text.trim());
        m.reply(`✅ Goodbye message updated.`);
    }
});

addCommand({
    pattern: 'setantilink',
    alias: ["antilink"],
    react: "⚙️",
    category: "group",
    desc: "Set antilink mode",
    handler: async (m, { text, isGroup, isAdmin, isOwner }) => {
        if (!isGroup) return m.reply(global.messages.group);
        if (!isAdmin && !isOwner) return m.reply(global.messages.admin);

        const input = (text || "").toLowerCase().trim();
        const modeMap = { on: "delete", off: "false", true: "delete", false: "false", delete: "delete", kick: "kick", warn: "warn" };
        const value = modeMap[input];

        if (!value) {
            const warnCount = await getGroupSetting(m.chat, "ANTILINK_WARN_COUNT");
            return m.reply(`❌ Modes: on/delete, warn, kick, off\n(Warn limit: ${warnCount})`);
        }

        const current = await getGroupSetting(m.chat, "ANTILINK");
        if (current === value) return m.reply(`⚠️ Antilink is already: *${value.toUpperCase()}*`);

        await setGroupSetting(m.chat, "ANTILINK", value);
        m.reply(`✅ Antilink set to: *${value.toUpperCase()}*`);
    }
});

addCommand({
    pattern: 'antilinkwarn',
    alias: ["setwarncount", "warncount", "antilinkwarncount"],
    react: "⚙️",
    category: "group",
    desc: "Set antilink warning limit",
    handler: async (m, { text, isGroup, isAdmin, isOwner }) => {
        if (!isGroup) return m.reply(global.messages.group);
        if (!isAdmin && !isOwner) return m.reply(global.messages.admin);

        const count = parseInt(text);
        if (!text) {
            const current = await getGroupSetting(m.chat, "ANTILINK_WARN_COUNT") || "5";
            return m.reply(`⚠️ Current warn count: *${current}*`);
        }

        if (isNaN(count) || count < 1 || count > 10) return m.reply("❌ Provide number 1-10");

        await setGroupSetting(m.chat, "ANTILINK_WARN_COUNT", count.toString());
        m.reply(`✅ Antilink warn count set to: *${count}*`);
    }
});

addCommand({
    pattern: 'setantibad',
    alias: ["antibad", "antibadwords"],
    react: "⚙️",
    category: "group",
    desc: "Set antibad mode",
    handler: async (m, { text, isGroup, isAdmin, isOwner }) => {
        if (!isGroup) return m.reply(global.messages.group);
        if (!isAdmin && !isOwner) return m.reply(global.messages.admin);

        const input = (text || "").toLowerCase().trim();
        const modeMap = { on: "delete", off: "false", true: "delete", false: "false", delete: "delete", kick: "kick", warn: "warn" };
        const value = modeMap[input];

        if (!value) {
            const warnCount = await getGroupSetting(m.chat, "ANTIBAD_WARN_COUNT");
            const badWords = await getBadWords(m.chat);
            return m.reply(`❌ Modes: on/delete, warn, kick, off\n(Warn limit: ${warnCount})\n\nBad words: ${badWords.length}`);
        }

        const current = await getGroupSetting(m.chat, "ANTIBAD");
        if (current === value) return m.reply(`⚠️ Antibad is already: *${value.toUpperCase()}*`);

        await setGroupSetting(m.chat, "ANTIBAD", value);
        m.reply(`✅ Antibad set to: *${value.toUpperCase()}*`);
    }
});

addCommand({
    pattern: 'antibadwarn',
    alias: ["badwarncount", "antibadwarncount", "setbadwarn"],
    react: "⚙️",
    category: "group",
    desc: "Set antibad warning limit",
    handler: async (m, { text, isGroup, isAdmin, isOwner }) => {
        if (!isGroup) return m.reply(global.messages.group);
        if (!isAdmin && !isOwner) return m.reply(global.messages.admin);

        const count = parseInt(text);
        if (!text) {
            const current = await getGroupSetting(m.chat, "ANTIBAD_WARN_COUNT") || "5";
            return m.reply(`⚠️ Current antibad warn count: *${current}*`);
        }

        if (isNaN(count) || count < 1 || count > 10) return m.reply("❌ Provide number 1-10");

        await setGroupSetting(m.chat, "ANTIBAD_WARN_COUNT", count.toString());
        m.reply(`✅ Antibad warn count set to: *${count}*`);
    }
});

addCommand({
    pattern: 'badwords',
    alias: ["setbadwords", "badword", "profanity"],
    react: "🚫",
    category: "group",
    desc: "Manage bad words list",
    handler: async (m, { args, conn, isGroup, isAdmin, isOwner }) => {
        if (!isGroup) return m.reply(global.messages.group);
        if (!isAdmin && !isOwner) return m.reply(global.messages.admin);

        const action = (args[0] || "").toLowerCase();
        const words = args.slice(1);

        if (!action || !["add", "remove", "del", "delete", "list", "clear", "reset", "default", "defaults"].includes(action)) {
            const badWords = await getBadWords(m.chat);
            return m.reply(`📋 *Bad Words Management*\n\nUsage: .badwords add/remove/list/clear/default\n\nCurrent list: ${badWords.length} words.`);
        }

        try {
            if (action === "add") {
                if (words.length === 0) return m.reply("❌ Provide word(s) to add.");
                for (const w of words) if (w.length >= 2) await addBadWord(m.chat, w);
                m.reply(`✅ Added bad words.`);
            }
            else if (["remove", "del", "delete"].includes(action)) {
                if (words.length === 0) return m.reply("❌ Provide word(s) to remove.");
                for (const w of words) await removeBadWord(m.chat, w);
                m.reply(`✅ Removed bad words.`);
            }
            else if (action === "list") {
                const badWords = await getBadWords(m.chat);
                if (badWords.length === 0) return m.reply("📭 No bad words set.");

                // Chunking for display
                const chunks = [];
                for (let i = 0; i < badWords.length; i += 20) chunks.push(badWords.slice(i, i + 20));

                for (let i = 0; i < chunks.length; i++) {
                    const msg = (i === 0 ? `🚫 *BAD WORDS LIST*\n\n` : ``) + chunks[i].map((w, idx) => `${i * 20 + idx + 1}. ${w}`).join("\n");
                    await conn.sendMessage(m.chat, { text: msg });
                }
            }
            else if (["clear", "reset"].includes(action)) {
                await clearBadWords(m.chat);
                m.reply("✅ All bad words cleared.");
            }
            else if (["default", "defaults"].includes(action)) {
                const added = await initializeDefaultBadWords(m.chat);
                m.reply(`✅ Default bad words loaded (${added} new).`);
            }
        } catch (error) {
            m.reply(`❌ Error: ${error.message}`);
        }
    }
});

/**
 * ORIGINAL DATABASE & NOTES COMMANDS
 * (Kept for compatibility)
 */
addCommand({
    pattern: 'resetdb',
    category: "owner",
    handler: async (m, { text, isOwner }) => {
        if (!isOwner) return m.reply(global.messages.owner);
        if (text !== "confirm") return m.reply("⚠️ Type *.resetdb confirm* to wipe all settings.");

        await resetAllSettings();
        await clearAllSudo();
        m.reply("✅ Database reset.");
    }
});

addCommand({
    pattern: 'resetsudo',
    category: "owner",
    handler: async (m, { isOwner }) => {
        if (!isOwner) return m.reply(global.messages.owner);
        const count = await clearAllSudo();
        m.reply(`✅ Cleared ${count} sudo numbers.`);
    }
});

addCommand({
    pattern: 'allnotes',
    category: "owner",
    handler: async (m, { isOwner }) => {
        if (!isOwner) return m.reply(global.messages.owner);
        const notes = await getAllUsersNotes();
        if (!notes.length) return m.reply("📭 No notes.");

        let msg = "📋 *ALL NOTES*\n\n";
        notes.forEach(n => msg += `🆔 ${n.id} | 👤 ${n.userJid?.split('@')[0]}\n📝 ${n.content.substring(0, 50)}...\n\n`);
        m.reply(msg);
    }
});

addCommand({
    pattern: 'admindelnote',
    category: "owner",
    handler: async (m, { text, isOwner }) => {
        if (!isOwner) return m.reply(global.messages.owner);
        if (!text) return m.reply("❌ Provide ID");
        const success = await deleteNoteById(text);
        m.reply(success ? "✅ Deleted" : "❌ Not found");
    }
});

addCommand({
    pattern: 'adminclearnotes',
    category: "owner",
    handler: async (m, { text, isOwner }) => {
        if (!isOwner) return m.reply(global.messages.owner);
        if (!text) return m.reply("❌ Provide user number");
        const count = await deleteAllNotes(text.replace(/\D/g, "") + "@s.whatsapp.net");
        m.reply(`✅ Deleted ${count} notes.`);
    }
});
