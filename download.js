import axios from "axios";
export default {
  pattern: "tt",
  react: "📥",
  async function(conn, mek, m, ctx) {
    if (!ctx.q) return m.reply("🔗 TikTok link එකක් ලබා දෙන්න.");
    try {
      const { data } = await axios.get(`https://www.tikwm.com/api/?url=${ctx.q}`);
      await conn.sendMessage(ctx.from, { video: { url: data.data.play }, caption: "✅ Downloaded by LUCIFER-MD" }, { quoted: mek });
    } catch (e) { m.reply("❌ Download failed."); }
  }
};
