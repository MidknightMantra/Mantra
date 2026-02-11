const { normalizeJid } = require("../lib/groupTools");

function pickParticipantJid(participant) {
    if (!participant || typeof participant !== "object") return "";

    const candidates = [
        participant.jid,
        participant.pn,
        participant.id,
        participant.phoneNumber
    ];

    for (const value of candidates) {
        const normalized = normalizeJid(String(value || ""));
        if (normalized && normalized.endsWith("@s.whatsapp.net")) {
            return normalized;
        }
    }

    return "";
}

module.exports = {
    name: "vcf",
    react: "📇",
    category: "group",
    description: "Export all group participants as VCF contact file",
    usage: ",vcf",
    aliases: ["contacts", "savecontact", "scontact", "savecontacts"],

    execute: async (sock, m) => {
        try {
            if (!m.isGroup) {
                await m.reply("❌ This command can only be used in groups.");
                return;
            }

            await m.react("⏳").catch(() => {});

            const metadata = await sock.groupMetadata(m.from);
            const participants = Array.isArray(metadata?.participants) ? metadata.participants : [];
            const groupName = String(metadata?.subject || "Group").trim() || "Group";

            if (!participants.length) {
                await m.react("❌").catch(() => {});
                await m.reply("❌ No participants found in this group.");
                return;
            }

            let index = 1;
            const cards = [];

            for (const participant of participants) {
                const jid = pickParticipantJid(participant);
                if (!jid) continue;
                const id = jid.split("@")[0];
                if (!id) continue;

                cards.push(
                    [
                        "BEGIN:VCARD",
                        "VERSION:3.0",
                        `FN:[${index}] +${id}`,
                        `TEL;type=CELL;type=VOICE;waid=${id}:+${id}`,
                        "END:VCARD"
                    ].join("\n")
                );

                index += 1;
            }

            const count = cards.length;
            if (!count) {
                await m.react("❌").catch(() => {});
                await m.reply("❌ Could not extract valid WhatsApp contacts from this group.");
                return;
            }

            await m.reply(`Saving ${count} participant contacts...`);

            const fileName = `${groupName}.vcf`.replace(/[\\/:*?"<>|]/g, "_");
            const body = cards.join("\n");

            await sock.sendMessage(
                m.from,
                {
                    document: Buffer.from(body, "utf8"),
                    mimetype: "text/vcard",
                    fileName,
                    caption: `Done saving.\nGroup Name: *${groupName}*\nContacts: *${count}*`
                },
                { quoted: m.raw }
            );

            await m.react("✅").catch(() => {});
        } catch (e) {
            await m.react("❌").catch(() => {});
            await m.reply(`❌ Failed to export contacts: ${e?.message || e}`);
        }
    }
};

