const axios = require("axios");

module.exports = {
    name: "githubstalk",
    react: "🐙",
    category: "search",
    description: "Fetch GitHub profile details",
    usage: ",githubstalk <username>",
    aliases: ["ghstalk", "gitstalk", "github"],

    execute: async (_sock, m) => {
        try {
            const username = String(m.args?.[0] || "").trim();
            if (!username) {
                await m.reply(`Please provide a GitHub username.\nUsage: ${m.prefix}githubstalk <username>`);
                return;
            }

            const url = `https://api.github.com/users/${encodeURIComponent(username)}`;
            const response = await axios.get(url, {
                timeout: 15000,
                headers: {
                    "User-Agent": "Mantra-Bot"
                }
            });

            const user = response.data || {};
            const bio = user.bio || "No bio";
            const company = user.company || "N/A";
            const location = user.location || "N/A";
            const blog = user.blog || "N/A";

            const text = `
🐙 *GitHub Profile Stalk*

👤 *Username:* ${user.login}
📝 *Name:* ${user.name || "N/A"}
📚 *Bio:* ${bio}
🏢 *Company:* ${company}
📍 *Location:* ${location}
🔗 *Blog:* ${blog}
📦 *Public Repos:* ${user.public_repos ?? 0}
👥 *Followers:* ${user.followers ?? 0}
➡️ *Following:* ${user.following ?? 0}
📅 *Created:* ${user.created_at ? new Date(user.created_at).toLocaleDateString("en-GB") : "N/A"}
🌐 *Profile:* ${user.html_url || "N/A"}
> *Mantra GitHub Stalker*
`;

            if (user.avatar_url) {
                await _sock.sendMessage(m.from, {
                    image: { url: user.avatar_url },
                    caption: text.trim()
                });
                return;
            }

            await m.reply(text.trim());
        } catch (e) {
            console.error("githubstalk error:", e?.response?.data || e?.message || e);
            if (e?.response?.status === 404) {
                await m.reply("GitHub user not found. Please check the username.");
                return;
            }
            if (e?.response?.status === 403) {
                await m.reply("GitHub API rate limit reached. Try again later.");
                return;
            }
            await m.reply("An error occurred while fetching GitHub profile.");
        }
    }
};
