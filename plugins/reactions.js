const REACTION_PACKS = {
    hype: ["🔥", "⚡", "🚀", "💥", "🧨", "🎯"],
    love: ["❤️", "🫶", "😍", "🥰", "💘", "💞"],
    funny: ["😂", "🤣", "😹", "🤪", "😆", "🫠"],
    wow: ["😮", "🤯", "😲", "✨", "🪄", "🌟"],
    chill: ["😌", "🧘", "🌿", "🫶", "🛋️", "🧊"],
    support: ["👏", "✅", "💯", "🙌", "🫡", "🤝"],
    chaos: ["👀", "😈", "🌀", "👽", "🪩", "🤖"]
};

const KEYWORD_TO_PACK = {
    hype: "hype",
    fire: "hype",
    energy: "hype",
    love: "love",
    heart: "love",
    romantic: "love",
    funny: "funny",
    joke: "funny",
    lol: "funny",
    wow: "wow",
    shock: "wow",
    amazing: "wow",
    chill: "chill",
    calm: "chill",
    relax: "chill",
    support: "support",
    approve: "support",
    respect: "support",
    chaos: "chaos",
    weird: "chaos",
    alien: "chaos"
};

function pickRandom(list) {
    return list[Math.floor(Math.random() * list.length)];
}

function normalizeToken(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
}

function resolvePack(value) {
    const normalized = normalizeToken(value);
    const key = KEYWORD_TO_PACK[normalized] || normalized;
    return REACTION_PACKS[key] || null;
}

function buildPackPreview() {
    return Object.entries(REACTION_PACKS)
        .map(([name, emojis]) => `• *${name}:* ${emojis.slice(0, 4).join(" ")}`)
        .join("\n");
}

module.exports = {
    name: "reactions",
    react: "🎭",
    category: "fun",
    description: "Get cool reaction emojis or react to a replied message",
    usage: ",reactions [pack|emoji]",
    aliases: ["reaction", "reacts", "emojipack", "mood"],

    execute: async (sock, m) => {
        try {
            const input = String((m.args || []).join(" ") || "").trim();
            const wantsHelp = ["help", "list", "packs"].includes(normalizeToken(input));
            const quotedKey = m.quotedKey || null;

            if (!input || wantsHelp) {
                const preview = buildPackPreview();
                const text = [
                    "🎭 *REACTIONS MENU*",
                    "",
                    preview,
                    "",
                    "Use:",
                    "• `,reactions <pack>` for a random emoji from a pack",
                    "• `,reactions <emoji>` to echo an emoji",
                    "• Reply to a message + `,reactions <pack|emoji>` to react on that message"
                ].join("\n");
                await m.reply(text);
                return;
            }

            const pack = resolvePack(input);
            const chosen = pack ? pickRandom(pack) : input;

            if (quotedKey) {
                await sock.sendMessage(m.from, { react: { text: chosen, key: quotedKey } });
                await m.reply(`✨ Reacted with ${chosen}`);
                return;
            }

            await m.reply(`✨ Reaction: ${chosen}\n\nTip: reply to a message and use \`,reactions ${chosen}\``);
        } catch (error) {
            console.error("reactions error:", error?.message || error);
            await m.reply("Couldn't process reactions right now. Try again.");
        }
    }
};
