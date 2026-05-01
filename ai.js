import { GoogleGenAI } from "@google/genai";
const genAI = new GoogleGenAI("AIzaSyAx7tv6fllc3wrT9tovRIJGbcIjn0w-oPc");

export default {
  pattern: "ai",
  react: "🤖",
  async function(conn, mek, m, ctx) {
    if (!ctx.q) return m.reply("🤖 කියන්න සදරූ, මම ඔයාට කොහොමද උදව් කරන්න ඕනේ?");
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(ctx.q);
      const response = await result.response;
      m.reply(`🤖 *LUCIFER AI*\n\n${response.text()}\n\n© 𝟚𝟘𝟚𝟔 𝕃𝕌𝕍𝕀𝕐𝔸 𝕄𝔻 𝕋𝔼𝔸𝕄`);
    } catch (e) { m.reply("❌ AI Error."); }
  }
};
