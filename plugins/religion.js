import { addCommand } from '../lib/plugins.js';
import axios from 'axios';
import { sendButtons } from 'gifted-btns';
import { log } from '../src/utils/logger.js';

addCommand({
    pattern: 'bible',
    alias: ['verse', 'bibleverse', 'scripture'],
    category: 'religion',
    react: '📖',
    desc: 'Get Bible verses',
    handler: async (m, { text, conn }) => {
        const verse = text?.trim();
        if (!verse) {
            return m.reply("❌ Please provide a Bible verse reference\n\nUsage:\n.bible John 3:16\n.bible John 3:16-20\n.bible John 3");
        }

        try {
            const apiUrl = `${global.giftedApiUrl}/api/tools/bible`;
            const res = await axios.get(apiUrl, {
                params: { apikey: global.giftedApiKey, verse: verse }
            });

            if (!res.data?.success || !res.data?.result) {
                return m.reply("❌ Failed to fetch Bible verse. Please check the reference format.");
            }

            const r = res.data.result;

            let txt = `*${global.botName} BIBLE*\n\n`;
            txt += `📖 *Verse:* ${r.verse || verse}\n`;
            txt += `📊 *Verse Count:* ${r.versesCount || 1}\n\n`;
            txt += `*English:*\n${r.data?.trim() || "N/A"}\n\n`;

            if (r.translations) {
                if (r.translations.swahili) {
                    txt += `*Swahili:*\n${r.translations.swahili}\n\n`;
                }
                if (r.translations.hindi) {
                    txt += `*Hindi:*\n${r.translations.hindi}\n\n`;
                }
            }

            const copyContent = r.data?.trim() || "";

            await sendButtons(conn, m.chat, {
                text: txt,
                footer: global.botName,
                buttons: [
                    {
                        name: "cta_copy",
                        buttonParamsJson: JSON.stringify({
                            display_text: "📋 Copy Verse",
                            copy_code: copyContent
                        })
                    }
                ]
            });

        } catch (error) {
            log.error("Bible verse error:", error);
            m.reply("❌ Failed to fetch Bible verse: " + (error.message || "Unknown error"));
        }
    }
});
