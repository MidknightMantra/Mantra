const axios = require('axios');

module.exports = {
    name: 'repo',
    aliases: ['repository', 'github', 'source'],
    description: 'Get information about the bot repository',
    tags: ['main'],
    command: /^\.?(repo|repository|github|source)/i,

    async execute(sock, m) {
        const repoOwner = 'MidknightMantra';  // Your GitHub username
        const repoName = 'Mantra';           // Your repository name

        try {
            // Fetch repository information from GitHub API
            const repoResponse = await axios.get(`https://api.github.com/repos/${repoOwner}/${repoName}`);
            const repoData = repoResponse.data;

            // Fetch contributors information
            let contributorsText = 'Loading...';
            try {
                const contributorsResponse = await axios.get(`https://api.github.com/repos/${repoOwner}/${repoName}/contributors`);
                const contributors = contributorsResponse.data;

                if (contributors && contributors.length > 0) {
                    contributorsText = contributors
                        .slice(0, 10) // Limit to top 10 contributors
                        .map((contributor, index) => `${index + 1}. [${contributor.login}](${contributor.html_url}) - ${contributor.contributions} contributions`)
                        .join('\n');
                } else {
                    contributorsText = 'No contributors yet';
                }
            } catch (contribErr) {
                console.error('Error fetching contributors:', contribErr.message);
                contributorsText = 'Unable to fetch contributors';
            }

            // Format the repository information
            const repoInfo = `
*🤖Repository Info*

*Name:* ${repoData.full_name}
*Description:* ${repoData.description || 'No description provided'}
*Stars:* ⭐ ${repoData.stargazers_count}
*Forks:* 🍴 ${repoData.forks_count}
*Issues:* ❗ ${repoData.open_issues_count}
*Language:* 📚 ${repoData.language || 'Not specified'}
*License:* 📄 ${repoData.license ? repoData.license.spdx_id : 'Not specified'}
*Size:* 💾 ${repoData.size} KB
*Created:* 📅 ${new Date(repoData.created_at).toLocaleDateString()}
*Last Updated:* 🔄 ${new Date(repoData.updated_at).toLocaleDateString()}

*Contributors:*
${contributorsText}

*Repository URL:* 
${repoData.html_url}
            `.trim();

            // Send the repository information
            await m.reply(repoInfo);

        } catch (err) {
            console.error('Repo plugin error:', err);

            if (err.response && err.response.status === 404) {
                await m.reply('❌ Repository not found. Please check the repository name.');
            } else if (err.response && err.response.status === 403) {
                await m.reply('❌ GitHub API rate limit exceeded. Please try again later.');
            } else {
                await m.reply('❌ Failed to fetch repository information. Please try again later.');
            }
        }
    }
};