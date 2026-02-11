module.exports = {
    name: "onwa",
    react: "🔍",
    category: "utility",
    description: "Check if a phone number is registered on WhatsApp",
    usage: ",onwa <number>",
    aliases: ["onwhatsapp", "checkwa", "checknumber"],

    execute: async (sock, m) => {
        try {
            const raw = String(m.args?.join(" ") || "").trim();
            if (!raw) {
                await m.reply(
                    "❌ Please provide a phone number.\n\nUsage: ,onwa <number>\nExample: ,onwa 254712345678"
                );
                return;
            }

            const num = raw.replace(/\D/g, "");
            if (num.length < 7 || num.length > 15) {
                await m.reply(
                    "❌ Invalid phone number format.\nPlease include country code.\nExample: ,onwa 254712345678"
                );
                return;
            }

            await m.react("⏳");

            const resultList = await sock.onWhatsApp(num);
            const result = Array.isArray(resultList) ? resultList[0] : null;

            if (result?.exists) {
                await m.react("✅");
                await m.reply(
                    `✅ *Number Found on WhatsApp*\n\n📞 *Number:* ${num}\n🆔 *JID:* ${result.jid}`
                );
                return;
            }

            await m.react("❌");
            await m.reply(`❌ *Not on WhatsApp*\n\n📞 *Number:* ${num}`);
        } catch (e) {
            await m.react("⚠️").catch(() => {});
            await m.reply(`⚠️ Could not verify number right now.\nError: ${e?.message || e}`);
        }
    }
};

