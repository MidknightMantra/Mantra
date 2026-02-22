function getPlatform() {
    const platform = process.platform;
    if (platform === "win32") return "Windows";
    if (platform === "darwin") return "macOS";
    if (platform === "linux") return "Linux";
    if (platform === "android") return "Android";
    return platform;
}

function runtime(seconds) {
    const total = Math.max(0, Math.floor(Number(seconds) || 0));
    const d = Math.floor(total / 86400);
    const h = Math.floor((total % 86400) / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const parts = [];
    if (d) parts.push(`${d}d`);
    if (h) parts.push(`${h}h`);
    if (m) parts.push(`${m}m`);
    parts.push(`${s}s`);
    return parts.join(" ");
}

function formatMb(bytes) {
    return `${(Number(bytes || 0) / 1024 / 1024).toFixed(1)} MB`;
}

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function sanitizeError(err) {
    const msg = String(err?.message || err || "Unknown error");
    return msg
        .replace(/\/home\/[\w/.-]+/g, "[path]")
        .replace(/\b\d{1,3}(\.\d{1,3}){3}\b/g, "[ip]")
        .replace(/Bearer\s+\S+/gi, "[token]")
        .replace(/api[_-]?key[=:]\S+/gi, "[key]")
        .slice(0, 200);
}

module.exports = {
    getPlatform,
    runtime,
    formatMb,
    delay,
    sanitizeError
};
