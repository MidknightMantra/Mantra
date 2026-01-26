module.exports = {
    cmd: ['menu', 'help'],
    run: async ({ m }) => {
        // Look how clean this is thanks to lib/simple.js!
        await m.reply(`*Mantra v1.0*\n\nUser: ${m.sender}\nCommand: ${m.text}`);
    }
};
