export class SimpleStore {
    constructor() {
        this.chats = {};
    }

    bind(ev) {
        ev.on('messages.upsert', ({ messages }) => {
            for (const m of messages) {
                if (!m.message) continue;
                const jid = m.key.remoteJid;
                if (!this.chats[jid]) this.chats[jid] = {};
                this.chats[jid][m.key.id] = m;

                // Optional: Trim memory to avoid leaks (keep last 50 per chat)
                const keys = Object.keys(this.chats[jid]);
                if (keys.length > 50) {
                    delete this.chats[jid][keys[0]];
                }
            }
        });
    }

    async loadMessage(jid, id) {
        return this.chats[jid]?.[id];
    }

    // Config compatibility
    writeToFile(path) {
        // No-op for now or implement JSON write
    }
    readFromFile(path) {
        // No-op
    }
}
