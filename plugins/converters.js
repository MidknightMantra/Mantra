import { gmd, toAudio, toVideo, toPtt, stickerToImage, gmdFancy, gmdRandom, getSetting, runFFmpeg, getVideoDuration, gmdSticker } from "../lib/gift.js";
import fs from "fs/promises";
import pkgSticker from "wa-sticker-formatter";
const { StickerTypes } = pkgSticker;

/**
 * 🔄 STICKER CONVERTER
 */
gmd({
    pattern: "sticker",
    aliases: ["st", "s", "take"],
    category: "converter",
    react: "🔄️",
    description: "Convert image/video/sticker to sticker.",
}, async (from, Gifted, conText) => {
    const { q, mek, reply, react, quoted, packName, packAuthor } = conText;

    try {
        if (!quoted) {
            await react("❌");
            return reply("Please reply to/quote an image, video or sticker");
        }

        const quotedImg = quoted?.imageMessage || quoted?.message?.imageMessage;
        const quotedSticker = quoted?.stickerMessage || quoted?.message?.stickerMessage;
        const quotedVideo = quoted?.videoMessage || quoted?.message?.videoMessage;

        if (!quotedImg && !quotedSticker && !quotedVideo) {
            await react("❌");
            return reply("That quoted message is not an image, video or sticker");
        }

        let tempFilePath;
        try {
            if (quotedImg || quotedVideo) {
                tempFilePath = await Gifted.downloadAndSaveMediaMessage(
                    quotedImg || quotedVideo,
                    "temp_media"
                );

                let fileExt = quotedImg ? ".jpg" : ".mp4";
                let mediaFile = gmdRandom(fileExt);
                const data = await fs.readFile(tempFilePath);
                await fs.writeFile(mediaFile, data);

                // 🔥 If video → convert to webp
                if (quotedVideo) {
                    const compressedFile = gmdRandom(".webp");
                    let duration = 8; // default duration

                    try {
                        duration = await getVideoDuration(mediaFile);
                        if (duration > 10) duration = 10; // trim to first 10 seconds
                    } catch (e) {
                        console.error("Using default duration due to error:", e);
                    }

                    await runFFmpeg(mediaFile, compressedFile, 320, 15, duration);
                    await fs.unlink(mediaFile).catch(() => { });
                    mediaFile = compressedFile;
                }

                const stickerBuffer = await gmdSticker(mediaFile, {
                    pack: packName || "𝐌𝐀𝐍𝐓𝐑𝐀-𝐌𝐃",
                    author: packAuthor || "𝐌𝐈𝐃𝐊𝐍𝐈𝐆𝐇𝐓",
                    type: q.includes("--crop") || q.includes("-c") ? StickerTypes.CROPPED : StickerTypes.FULL,
                    categories: ["🤩", "🎉"],
                    id: "12345",
                    quality: 75,
                    background: "transparent"
                });

                await fs.unlink(mediaFile).catch(() => { });
                await react("✅");
                return Gifted.sendMessage(from, { sticker: stickerBuffer }, { quoted: mek });

            } else if (quotedSticker) {
                // Sticker → Sticker (recompress/reauthor)
                tempFilePath = await Gifted.downloadAndSaveMediaMessage(quotedSticker, "temp_media");
                const stickerData = await fs.readFile(tempFilePath);
                const stickerFile = gmdRandom(".webp");
                await fs.writeFile(stickerFile, stickerData);

                const newStickerBuffer = await gmdSticker(stickerFile, {
                    pack: packName || "𝐌𝐀𝐍𝐓𝐑𝐀-𝐌𝐃",
                    author: packAuthor || "𝐌𝐈𝐃𝐊𝐍𝐈𝐆𝐇𝐓",
                    type: q.includes("--crop") || q.includes("-c") ? StickerTypes.CROPPED : StickerTypes.FULL,
                    categories: ["🤩", "🎉"],
                    id: "12345",
                    quality: 75,
                    background: "transparent"
                });

                await fs.unlink(stickerFile).catch(() => { });
                await react("✅");
                return Gifted.sendMessage(from, { sticker: newStickerBuffer }, { quoted: mek });
            }
        } finally {
            if (tempFilePath) await fs.unlink(tempFilePath).catch(() => { });
        }
    } catch (e) {
        console.error("Error in sticker command:", e);
        await react("❌");
        await reply("Failed to convert to sticker");
    }
});

/**
 * 🔄 STICKER TO IMAGE
 */
gmd({
    pattern: "toimg",
    aliases: ["s2img", "photo"],
    category: "converter",
    react: "🔄️",
    description: "Convert Sticker to Image.",
}, async (from, Gifted, conText) => {
    const { mek, reply, sender, botName, react, quoted, botFooter, newsletterJid } = conText;

    try {
        const quotedSticker = quoted?.stickerMessage || quoted?.message?.stickerMessage;
        if (!quotedSticker) {
            await react("❌");
            return reply("Please reply to a sticker");
        }

        let tempFilePath;
        try {
            tempFilePath = await Gifted.downloadAndSaveMediaMessage(quotedSticker, 'temp_media');
            const stickerBuffer = await fs.readFile(tempFilePath);
            const imageBuffer = await stickerToImage(stickerBuffer);

            await Gifted.sendMessage(from, {
                image: imageBuffer,
                caption: `*Converted via ${botName}*`,
                contextInfo: {
                    mentionedJid: [sender],
                    forwardingScore: 5,
                    isForwarded: true
                },
            }, { quoted: mek });
            await react("✅");
        } finally {
            if (tempFilePath) await fs.unlink(tempFilePath).catch(() => { });
        }
    } catch (e) {
        console.error("Error in toimg command:", e);
        await react("❌");
        await reply("Failed to convert sticker to image");
    }
});

/**
 * 🔄 VIDEO TO AUDIO
 */
gmd({
    pattern: "toaudio",
    aliases: ['tomp3', 'extract'],
    category: "converter",
    react: "🔄️",
    description: "Convert video to audio"
},
    async (from, Gifted, conText) => {
        const { mek, reply, react, botPic, quoted, newsletterUrl } = conText;
        const quotedVideo = quoted?.videoMessage || quoted?.message?.videoMessage;

        if (!quotedVideo) {
            await react("❌");
            return reply("Please reply to a video message");
        }

        let tempFilePath;
        try {
            tempFilePath = await Gifted.downloadAndSaveMediaMessage(quotedVideo, 'temp_media');
            const buffer = await fs.readFile(tempFilePath);
            const convertedBuffer = await toAudio(buffer);

            await Gifted.sendMessage(from, {
                audio: convertedBuffer,
                mimetype: "audio/mpeg",
                externalAdReply: {
                    title: 'Converted Audio',
                    body: 'Video to Audio',
                    mediaType: 1,
                    thumbnailUrl: botPic,
                    sourceUrl: newsletterUrl,
                    renderLargerThumbnail: false,
                    showAdAttribution: true,
                }
            }, { quoted: mek });

            await react("✅");
        } catch (e) {
            console.error("Error in toaudio command:", e);
            await react("❌");
            const errMsg = e.message || String(e);
            if (errMsg.includes('no audio')) {
                await reply("This video has no audio track.");
            } else {
                await reply("Failed to convert video to audio");
            }
        } finally {
            if (tempFilePath) await fs.unlink(tempFilePath).catch(() => { });
        }
    }
);

/**
 * 🎙️ AUDIO TO PTT
 */
gmd({
    pattern: "toptt",
    aliases: ['tovoice', 'tovn'],
    category: "converter",
    react: "🎙️",
    description: "Convert audio to voice note"
},
    async (from, Gifted, conText) => {
        const { mek, reply, react, quoted } = conText;
        const quotedAudio = quoted?.audioMessage || quoted?.message?.audioMessage;

        if (!quotedAudio) {
            await react("❌");
            return reply("Please reply to an audio message");
        }

        let tempFilePath;
        try {
            tempFilePath = await Gifted.downloadAndSaveMediaMessage(quotedAudio, 'temp_media');
            const buffer = await fs.readFile(tempFilePath);
            const convertedBuffer = await toPtt(buffer);

            await Gifted.sendMessage(from, {
                audio: convertedBuffer,
                mimetype: "audio/ogg; codecs=opus",
                ptt: true,
            }, { quoted: mek });

            await react("✅");
        } catch (e) {
            console.error("Error in toptt command:", e);
            await react("❌");
            await reply("Failed to convert to voice note");
        } finally {
            if (tempFilePath) await fs.unlink(tempFilePath).catch(() => { });
        }
    }
);

/**
 * 🎥 AUDIO TO VIDEO
 */
gmd({
    pattern: "tovideo",
    aliases: ['tomp4', 'blackscreen'],
    category: "converter",
    react: "🎥",
    description: "Convert audio to video with black screen"
},
    async (from, Gifted, conText) => {
        const { mek, reply, react, quoted } = conText;
        const quotedAudio = quoted?.audioMessage || quoted?.message?.audioMessage;

        if (!quotedAudio) {
            await react("❌");
            return reply("Please reply to an audio message");
        }

        let tempFilePath;
        try {
            tempFilePath = await Gifted.downloadAndSaveMediaMessage(quotedAudio, 'temp_media');
            const buffer = await fs.readFile(tempFilePath);
            const convertedBuffer = await toVideo(buffer);

            await Gifted.sendMessage(from, {
                video: convertedBuffer,
                mimetype: "video/mp4",
                caption: 'Converted Video',
            }, { quoted: mek });

            await react("✅");
        } catch (e) {
            console.error("Error in tovideo command:", e);
            await react("❌");
            await reply("Failed to convert audio to video");
        } finally {
            if (tempFilePath) await fs.unlink(tempFilePath).catch(() => { });
        }
    }
);
