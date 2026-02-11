const fs = require("fs");
const path = require("path");

const STORE_PATH = path.resolve("./group-settings.json");

function ensureStore() {
    if (!fs.existsSync(STORE_PATH)) {
        const initial = { settings: {}, counters: {} };
        fs.writeFileSync(STORE_PATH, JSON.stringify(initial, null, 2));
    }
}

function readStore() {
    ensureStore();
    try {
        const parsed = JSON.parse(fs.readFileSync(STORE_PATH, "utf8"));
        return {
            settings: parsed?.settings && typeof parsed.settings === "object" ? parsed.settings : {},
            counters: parsed?.counters && typeof parsed.counters === "object" ? parsed.counters : {}
        };
    } catch {
        return { settings: {}, counters: {} };
    }
}

function writeStore(store) {
    fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
}

function normalizeGroupId(groupId) {
    return String(groupId || "").trim().toLowerCase();
}

function getGroupSetting(groupId, key, fallback = null) {
    const gid = normalizeGroupId(groupId);
    const settingKey = String(key || "").trim().toUpperCase();
    if (!gid || !settingKey) return fallback;

    const store = readStore();
    return store.settings?.[gid]?.[settingKey] ?? fallback;
}

function setGroupSetting(groupId, key, value) {
    const gid = normalizeGroupId(groupId);
    const settingKey = String(key || "").trim().toUpperCase();
    if (!gid || !settingKey) return;

    const store = readStore();
    if (!store.settings[gid]) store.settings[gid] = {};
    store.settings[gid][settingKey] = value;
    writeStore(store);
}

function getGroupCounter(groupId, bucket, userJid) {
    const gid = normalizeGroupId(groupId);
    const bucketKey = String(bucket || "").trim().toLowerCase();
    const userKey = String(userJid || "").trim().toLowerCase();
    if (!gid || !bucketKey || !userKey) return 0;

    const store = readStore();
    const value = store.counters?.[bucketKey]?.[gid]?.[userKey];
    const num = Number(value || 0);
    return Number.isFinite(num) ? num : 0;
}

function setGroupCounter(groupId, bucket, userJid, value) {
    const gid = normalizeGroupId(groupId);
    const bucketKey = String(bucket || "").trim().toLowerCase();
    const userKey = String(userJid || "").trim().toLowerCase();
    if (!gid || !bucketKey || !userKey) return;

    const store = readStore();
    if (!store.counters[bucketKey]) store.counters[bucketKey] = {};
    if (!store.counters[bucketKey][gid]) store.counters[bucketKey][gid] = {};

    const next = Math.max(0, Math.floor(Number(value || 0)));
    store.counters[bucketKey][gid][userKey] = next;
    writeStore(store);
}

function incrementGroupCounter(groupId, bucket, userJid, step = 1) {
    const current = getGroupCounter(groupId, bucket, userJid);
    const next = current + Math.max(1, Math.floor(Number(step || 1)));
    setGroupCounter(groupId, bucket, userJid, next);
    return next;
}

module.exports = {
    getGroupSetting,
    setGroupSetting,
    getGroupCounter,
    setGroupCounter,
    incrementGroupCounter
};

