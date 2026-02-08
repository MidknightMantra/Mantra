
/**
 * Helper to generate context info for messages
 * usage: await getContextInfo(mentions)
 */
export async function getContextInfo(mentions = []) {
    return {
        mentionedJid: mentions,
        forwardingScore: 999,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: '120363406444239886@newsletter',
            newsletterName: global.botName || 'Mantra Bot',
            serverMessageId: -1
        }
    };
}

export default { getContextInfo };
