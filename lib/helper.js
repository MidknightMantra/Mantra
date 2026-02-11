function getPlatform() {
    const platform = process.platform;

    if (platform === "win32") return "Windows";
    if (platform === "darwin") return "macOS";
    if (platform === "linux") return "Linux";
    if (platform === "android") return "Android";
    return platform;
}

module.exports = {
    getPlatform
};
