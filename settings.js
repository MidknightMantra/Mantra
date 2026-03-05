require('dotenv').config();

const settings = {
  // Array fallback: splits string by comma, or uses default array
  prefixes: process.env.PREFIXES ? process.env.PREFIXES.split(',') : ['.', '!', '/', '#'],

  packname: process.env.PACKNAME || 'Mantra',
  author: process.env.AUTHOR || 'MidknightMantra',
  timeZone: process.env.TIMEZONE || 'Africa/Nairobi',
  botName: process.env.BOT_NAME || "Mantra",
  botOwner: process.env.BOT_OWNER || 'Midknight Mantra',
  ownerNumber: process.env.OWNER_NUMBER || '254743032398',
  giphyApiKey: process.env.GIPHY_API_KEY || 'qnl7ssQChTdPjsKta2Ax2LMaGXz303tq',
  commandMode: process.env.COMMAND_MODE || "public",

  maxStoreMessages: Number(process.env.MAX_STORE_MESSAGES) || 20,
  tempCleanupInterval: Number(process.env.CLEANUP_INTERVAL) || 1 * 60 * 60 * 1000,
  storeWriteInterval: Number(process.env.STORE_WRITE_INTERVAL) || 10000,

  description: process.env.DESCRIPTION || "This is a bot for managing group commands and automating tasks.",
  version: "1.0.7",
  updateZipUrl: process.env.UPDATE_URL || "https://github.com/MidknightMantra/Mantra/archive/refs/heads/main.zip",
  channelLink: process.env.CHANNEL_LINK || "https://whatsapp.com/channel/0029Vb74Dlf4CrfoqpAEBC2T",
  ytch: process.env.YT_CHANNEL || "MidknightMantra"
};

module.exports = settings;
