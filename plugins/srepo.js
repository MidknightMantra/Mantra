const axios = require("axios");

function normalizeRepoInput(raw) {
    const input = String(raw || "").trim();
    if (!input) return "";

    const urlMatch = input.match(/github\.com\/([^/\s]+\/[^/\s?#]+)/i);
    if (urlMatch?.[1]) return urlMatch[1];

    return input.replace(/^\/+|\/+$/g, "");
}

module.exports = {
    name: "srepo",
    react: "📁",
    category: "other",
    description: "Fetch information about a GitHub repository",
    usage: ",srepo <owner/repo>",
    aliases: ["repoinfo", "ghrepo"],

    execute: async (sock, m) => {
        try {
            const query = normalizeRepoInput((m.args || []).join(" "));
            if (!query) {
                await m.reply(`Please provide a GitHub repository in this format:\n${m.prefix}srepo owner/repo`);
                return;
            }

            if (!/^[\w.-]+\/[\w.-]+$/i.test(query)) {
                await m.reply("Invalid repository format. Use: owner/repo");
                return;
            }

            const [owner, repo] = query.split("/");
            const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
            const response = await axios.get(url, {
                timeout: 15000,
                headers: {
                    "User-Agent": "Mantra-Bot",
                    Accept: "application/vnd.github+json"
                }
            });

            const data = response.data || {};
            const info = [
                "📁 *GitHub Repository Info*",
                "",
                `📌 *Name:* ${data.name || "N/A"}`,
                `👤 *Owner:* ${data.owner?.login || "N/A"}`,
                `🔗 *URL:* ${data.html_url || "N/A"}`,
                `📝 *Description:* ${data.description || "No description"}`,
                `⭐ *Stars:* ${data.stargazers_count ?? 0}`,
                `🍴 *Forks:* ${data.forks_count ?? 0}`,
                `👀 *Watchers:* ${data.watchers_count ?? 0}`,
                `🐛 *Open Issues:* ${data.open_issues_count ?? 0}`,
                `📅 *Created:* ${data.created_at ? new Date(data.created_at).toLocaleDateString("en-GB") : "N/A"}`,
                `🛠️ *Updated:* ${data.updated_at ? new Date(data.updated_at).toLocaleDateString("en-GB") : "N/A"}`,
                "",
                "> Mantra GitHub Repo"
            ].join("\n");

            if (data.owner?.avatar_url) {
                await sock.sendMessage(m.from, {
                    image: { url: data.owner.avatar_url },
                    caption: info
                });
                return;
            }

            await m.reply(info);
        } catch (e) {
            console.error("srepo error:", e?.response?.data || e?.message || e);
            if (e?.response?.status === 404) {
                await m.reply("Repository not found. Check owner/repo and try again.");
                return;
            }
            if (e?.response?.status === 403) {
                await m.reply("GitHub API rate limit reached. Try again later.");
                return;
            }
            await m.reply(`Error fetching repository info: ${e?.message || e}`);
        }
    }
};
