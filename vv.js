import { downloadMediaMessage } from "@whiskeysockets/baileys";

export default {
    pattern: "vv",
    alias: ["retrive", "save"],
    category: "Tools",
    react: "🔓",

    async function(conn, mek, m, ctx) {
        // Reply කර ඇති පණිවිඩය View-Once එකක්දැයි පරීක්ෂා කිරීම
        const q = m.quoted ? m.quoted : m;
        if (!q.msg.viewOnce) return m.reply("❌ Please reply to a View-Once message.");

        try {
            // Media එක download කරගැනීම
            const buffer = await downloadMediaMessage(q, "buffer");
            const caption = q.msg.caption || "✅ View-Once Retrived by LUCIFER-MD";

            if (/image/.test(q.mtype)) {
                await conn.sendMessage(ctx.from, { image: buffer, caption }, { quoted: mek });
            } else if (/video/.test(q.mtype)) {
                await conn.sendMessage(ctx.from, { video: buffer, caption }, { quoted: mek });
            }
            
            m.react("✅");
        } catch (err) {
            console.error(err);
            m.reply("❌ Failed to retrive View-Once media.");
        }
    }
};
