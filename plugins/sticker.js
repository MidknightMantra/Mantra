const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn, spawnSync } = require("child_process");
const Jimp = require("jimp");
const { downloadMediaMessage, downloadContentFromMessage } = require("gifted-baileys");

let ffmpegReady;

function hasFfmpeg() {
    if (typeof ffmpegReady === "boolean") return ffmpegReady;
    try {
        const probe = spawnSync("ffmpeg", ["-version"], { stdio: "ignore" });
        ffmpegReady = probe.status === 0;
    } catch {
        ffmpegReady = false;
    }
    return ffmpegReady;
}

function unwrapMessage(message) {
    let current = message && typeof message === "object" ? message : {};
    let guard = 0;

    while (current && guard < 12) {
        guard += 1;
        if (current.ephemeralMessage?.message) {
            current = current.ephemeralMessage.message;
            continue;
        }
        if (current.viewOnceMessage?.message) {
            current = current.viewOnceMessage.message;
            continue;
        }
        if (current.viewOnceMessageV2?.message) {
            current = current.viewOnceMessageV2.message;
            continue;
        }
        if (current.viewOnceMessageV2Extension?.message) {
            current = current.viewOnceMessageV2Extension.message;
            continue;
        }
        if (current.documentWithCaptionMessage?.message) {
            current = current.documentWithCaptionMessage.message;
            continue;
        }
        break;
    }

    return current && typeof current === "object" ? current : {};
}

function detectMedia(message) {
    const content = unwrapMessage(message);

    if (content.stickerMessage) {
        return {
            kind: "sticker",
            mediaNode: content.stickerMessage,
            downloadType: "sticker",
            mimetype: String(content.stickerMessage.mimetype || "image/webp")
        };
    }

    if (content.imageMessage) {
        return {
            kind: "image",
            mediaNode: content.imageMessage,
            downloadType: "image",
            mimetype: String(content.imageMessage.mimetype || "image/jpeg")
        };
    }

    if (content.videoMessage) {
        return {
            kind: "video",
            mediaNode: content.videoMessage,
            downloadType: "video",
            mimetype: String(content.videoMessage.mimetype || "video/mp4")
        };
    }

    if (content.documentMessage) {
        const mime = String(content.documentMessage.mimetype || "").toLowerCase();
        if (mime.startsWith("image/")) {
            return {
                kind: "image",
                mediaNode: content.documentMessage,
                downloadType: "document",
                mimetype: mime || "image/jpeg"
            };
        }
        if (mime.startsWith("video/") || mime.includes("gif")) {
            return {
                kind: "video",
                mediaNode: content.documentMessage,
                downloadType: "document",
                mimetype: mime || "video/mp4"
            };
        }
    }

    return null;
}

function buildSources(m) {
    const sources = [];
    const quotedMedia = detectMedia(m.quoted);
    if (quotedMedia) {
        sources.push({
            name: "quoted",
            ...quotedMedia,
            key: m.quotedKey || m.key,
            message: m.quoted
        });
    }

    const currentMedia = detectMedia(m.messageRaw || m.message);
    if (currentMedia) {
        sources.push({
            name: "current",
            ...currentMedia,
            key: m.key,
            message: m.messageRaw || m.message
        });
    }

    return sources;
}

async function streamToBuffer(stream) {
    const chunks = [];
    for await (const chunk of stream) {
        chunks.push(chunk);
    }
    return Buffer.concat(chunks);
}

async function downloadFromSource(sock, m, source) {
    if (source.name === "quoted" && typeof m.downloadQuoted === "function") {
        try {
            return await m.downloadQuoted();
        } catch {}
    }

    if (source.name === "current" && typeof m.download === "function") {
        try {
            return await m.download();
        } catch {}
    }

    try {
        return await downloadMediaMessage(
            { key: source.key, message: source.message },
            "buffer",
            {},
            { reuploadRequest: sock.updateMediaMessage }
        );
    } catch {}

    if (source.mediaNode && source.downloadType) {
        const stream = await downloadContentFromMessage(source.mediaNode, source.downloadType);
        return streamToBuffer(stream);
    }

    throw new Error("Failed to download media");
}

function runProcess(cmd, args) {
    return new Promise((resolve, reject) => {
        const child = spawn(cmd, args, { windowsHide: true });
        let stderr = "";

        child.stderr.on("data", (chunk) => {
            stderr += String(chunk || "");
        });

        child.on("error", (err) => reject(err));
        child.on("close", (code) => {
            if (code === 0) return resolve();
            reject(new Error(stderr.trim() || `${cmd} exited with code ${code}`));
        });
    });
}

function extensionForMime(mimetype) {
    const mime = String(mimetype || "").toLowerCase();
    if (mime.includes("png")) return ".png";
    if (mime.includes("webp")) return ".webp";
    if (mime.includes("gif")) return ".gif";
    if (mime.includes("mp4")) return ".mp4";
    if (mime.includes("webm")) return ".webm";
    if (mime.includes("mov")) return ".mov";
    if (mime.includes("mkv")) return ".mkv";
    return ".bin";
}

async function convertWithFfmpeg(inputPath, outputPath, kind) {
    const imageFilters =
        "scale=512:512:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000";
    const videoFilters =
        "scale=512:512:force_original_aspect_ratio=decrease,fps=12,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000";

    const args =
        kind === "video"
            ? [
                "-y",
                "-i",
                inputPath,
                "-t",
                "8",
                "-vf",
                videoFilters,
                "-an",
                "-vcodec",
                "libwebp",
                "-preset",
                "default",
                "-loop",
                "0",
                "-vsync",
                "0",
                "-q:v",
                "55",
                "-compression_level",
                "6",
                outputPath
            ]
            : [
                "-y",
                "-i",
                inputPath,
                "-vf",
                imageFilters,
                "-an",
                "-vcodec",
                "libwebp",
                "-preset",
                "default",
                "-loop",
                "0",
                "-q:v",
                "75",
                "-compression_level",
                "6",
                outputPath
            ];

    await runProcess("ffmpeg", args);
}

async function convertImageWithJimp(buffer) {
    const image = await Jimp.read(buffer);
    image.background(0x00000000);
    image.contain(
        512,
        512,
        Jimp.HORIZONTAL_ALIGN_CENTER | Jimp.VERTICAL_ALIGN_MIDDLE
    );
    image.quality(80);
    return image.getBufferAsync(Jimp.MIME_WEBP);
}

async function convertToSticker(buffer, source) {
    if (source.kind === "sticker") {
        return buffer;
    }

    if (hasFfmpeg()) {
        const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        const tempDir = path.join(os.tmpdir(), "mantra-sticker");
        const inputPath = path.join(tempDir, `in-${runId}${extensionForMime(source.mimetype)}`);
        const outputPath = path.join(tempDir, `out-${runId}.webp`);

        fs.mkdirSync(tempDir, { recursive: true });
        fs.writeFileSync(inputPath, buffer);
        try {
            await convertWithFfmpeg(inputPath, outputPath, source.kind);
            return fs.readFileSync(outputPath);
        } finally {
            try {
                fs.unlinkSync(inputPath);
            } catch {}
            try {
                fs.unlinkSync(outputPath);
            } catch {}
        }
    }

    if (source.kind === "image") {
        return convertImageWithJimp(buffer);
    }

    throw new Error("FFmpeg is required for animated/video stickers");
}

module.exports = {
    name: "sticker",
    react: "🧩",
    category: "convert",
    description: "Create sticker from image/video or clone quoted sticker",
    usage: ",sticker (reply to image/video/sticker) or send media with caption",
    aliases: ["s", "stc"],

    execute: async (sock, m) => {
        const sources = buildSources(m);
        if (!sources.length) {
            await m.reply(
                `Reply to image/video/sticker, or send media with caption ${m.prefix}sticker`
            );
            return;
        }

        const source = sources[0];
        try {
            const mediaBuffer = await downloadFromSource(sock, m, source);
            if (!Buffer.isBuffer(mediaBuffer) || !mediaBuffer.length) {
                throw new Error("Empty media buffer");
            }

            const stickerBuffer = await convertToSticker(mediaBuffer, source);
            await sock.sendMessage(m.from, { sticker: stickerBuffer }, { quoted: m.raw });
            console.log(`[sticker] ok source=${source.name} kind=${source.kind}`);
        } catch (err) {
            console.error("[sticker] command failed:", err?.message || err);
            await m.reply(`Failed to create sticker: ${err?.message || "unknown error"}`);
        }
    }
};
