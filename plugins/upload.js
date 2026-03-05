const axios = require("axios");
const { downloadMediaMessage } = require("gifted-baileys");

const GIFTED_API_KEY = process.env.GIFTED_API_KEY || "gifted";

// ── Provider implementations ─────────────────────────────────────────────────

async function uploadToCatbox(buffer, filename, mimetype) {
    const FormData = require("form-data");
    const form = new FormData();
    form.append("reqtype", "fileupload");
    form.append("fileToUpload", buffer, { filename, contentType: mimetype });

    const res = await axios.post("https://catbox.moe/user.php", form, {
        headers: form.getHeaders(),
        timeout: 30000
    });
    const url = String(res.data || "").trim();
    if (!url.startsWith("http")) throw new Error("Catbox returned invalid URL");
    return url;
}

async function uploadToGiftedCdn(buffer, filename, mimetype) {
    const FormData = require("form-data");
    const form = new FormData();
    form.append("file", buffer, { filename, contentType: mimetype });

    const res = await axios.post(
        `https://api.giftedtech.co.ke/api/upload/file?apikey=${GIFTED_API_KEY}`,
        form, { headers: form.getHeaders(), timeout: 30000 }
    );
    const url = res.data?.url || res.data?.link || res.data?.result;
    if (!url) throw new Error("Gifted CDN returned no URL");
    return url;
}

async function uploadToImgBB(buffer, filename) {
    const apiKey = process.env.IMGBB_API_KEY;
    if (!apiKey) throw new Error("IMGBB_API_KEY not set");

    const FormData = require("form-data");
    const form = new FormData();
    form.append("image", buffer.toString("base64"));
    form.append("name", filename);

    const res = await axios.post(`https://api.imgbb.com/1/upload?key=${apiKey}`, form, {
        headers: form.getHeaders(),
        timeout: 30000
    });
    const url = res.data?.data?.display_url || res.data?.data?.url;
    if (!url) throw new Error("ImgBB returned no URL");
    return url;
}

async function uploadToPixhost(buffer, filename) {
    const FormData = require("form-data");
    const form = new FormData();
    form.append("content", buffer, { filename });
    form.append("content_type", "0");

    const res = await axios.post("https://api.pixhost.to/images", form, {
        headers: { ...form.getHeaders(), Accept: "application/json" },
        timeout: 30000
    });
    const url = res.data?.show_url;
    if (!url) throw new Error("Pixhost returned no URL");
    return url;
}

async function uploadToGitHubCdn(buffer, filename) {
    const token = process.env.GITHUB_TOKEN;
    const repo = process.env.GITHUB_CDN_REPO; // format: "owner/repo"
    if (!token || !repo) throw new Error("GITHUB_TOKEN or GITHUB_CDN_REPO not set");

    const safeName = filename.replace(/[^a-z0-9._-]/gi, "_");
    const path = `cdn/${Date.now()}_${safeName}`;
    const content = buffer.toString("base64");

    const res = await axios.put(
        `https://api.github.com/repos/${repo}/contents/${path}`,
        { message: `upload ${safeName}`, content },
        {
            headers: { Authorization: `token ${token}`, Accept: "application/vnd.github.v3+json" },
            timeout: 30000
        }
    );
    const url = res.data?.content?.download_url;
    if (!url) throw new Error("GitHub CDN returned no URL");
    return url;
}

// ── Extension helper ─────────────────────────────────────────────────────────
function getExtension(mimetype) {
    const map = {
        "image/jpeg": "jpg", "image/png": "png", "image/gif": "gif", "image/webp": "webp",
        "video/mp4": "mp4", "video/webm": "webm", "audio/mpeg": "mp3", "audio/ogg": "ogg",
        "application/pdf": "pdf", "application/zip": "zip"
    };
    return map[mimetype] || "bin";
}

const PROVIDERS = {
    catbox: uploadToCatbox,
    gifted: uploadToGiftedCdn,
    imgbb: uploadToImgBB,
    pixhost: uploadToPixhost,
    github: uploadToGitHubCdn
};

module.exports = {
    name: "upload",
    react: "☁️",
    category: "tools",
    description: "Upload media to a CDN and get a direct link",
    usage: ",upload [catbox|gifted|imgbb|pixhost|github]  (reply to media)",
    aliases: ["cdn", "uploadfile", "hostfile", "cdnupload"],

    execute: async (sock, m) => {
        const provider = String(m.args?.[0] || "catbox").trim().toLowerCase();

        if (!PROVIDERS[provider]) {
            await m.reply(
                `☁️ *CDN Upload*\n\n` +
                `Usage: ${m.prefix}upload [provider] (reply to any media)\n\n` +
                `Providers:\n` +
                `• catbox — free, no key needed\n` +
                `• gifted — Gifted CDN\n` +
                `• imgbb — images only (needs IMGBB_API_KEY)\n` +
                `• pixhost — images only\n` +
                `• github — needs GITHUB_TOKEN + GITHUB_CDN_REPO`
            );
            return;
        }

        const quoted = m.quoted;
        if (!quoted) {
            await m.reply(`Reply to any media with ${m.prefix}upload [provider]`);
            return;
        }

        // Detect mimetype
        const msg = quoted;
        const mimetype =
            msg?.imageMessage?.mimetype ||
            msg?.videoMessage?.mimetype ||
            msg?.audioMessage?.mimetype ||
            msg?.documentMessage?.mimetype ||
            msg?.stickerMessage?.mimetype ||
            "application/octet-stream";

        await m.react("⏳");

        try {
            const buffer = await m.downloadQuoted();
            const ext = getExtension(mimetype);
            const filename = `mantra_${Date.now()}.${ext}`;

            const uploadFn = PROVIDERS[provider];
            const url = await uploadFn(buffer, filename, mimetype);

            await m.react("✅");
            await m.reply(
                `☁️ *Upload Successful!*\n\n` +
                `Provider: *${provider}*\n` +
                `URL: ${url}\n\n` +
                `> *Mantra*`
            );
        } catch (err) {
            console.error(`[upload:${provider}] error:`, err?.message || err);
            await m.react("❌");
            await m.reply(`❌ Upload to *${provider}* failed: ${err?.message || "Unknown error"}`);
        }
    }
};
