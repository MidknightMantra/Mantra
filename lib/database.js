import fs from 'fs';
import path from 'path';

const dbPath = './database.json';

// Initialize DB if it doesn't exist
if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify({ groups: {} }, null, 2));
}

export const getDB = () => {
    try {
        return JSON.parse(fs.readFileSync(dbPath));
    } catch (e) {
        return { groups: {} };
    }
};

export const updateDB = (data) => {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
};

// Toggle Welcome Function
export const setWelcome = (jid, status) => {
    const db = getDB();
    if (!db.groups[jid]) db.groups[jid] = {};
    db.groups[jid].welcome = status;
    updateDB(db);
};

// Check Status Function
export const isWelcomeOn = (jid) => {
    const db = getDB();
    return db.groups[jid]?.welcome || false; // Default is OFF
};