// Simple registry for commands
export const commands = {};

export const addCommand = (cmdObj) => {
    // cmdObj: { pattern: 'ping', desc: '...', fromMe: false, handler: async (m, { conn }) => ... }
    if (cmdObj.pattern) {
        commands[cmdObj.pattern] = cmdObj;
    }
};