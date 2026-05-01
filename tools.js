import { downloadMediaMessage } from "@whiskeysockets/baileys";
import axios from "axios";
import FormData from "form-data";

export default {
  pattern: "imgurl",
  react: "🔗",
  async function(conn, mek, m, ctx) {
    const q = m.quoted ? m.quoted : m;
    if (!/image/.test(q.mtype)) return m.reply("📷 ඡායාරූපයකට reply කරන්න.");
    const buffer = await downloadMediaMessage(q, "buffer");
    const form = new FormData();
    form.append("file", buffer, "image.jpg");
    const { data } = await axios.post("https://telegra.ph/upload", form, { headers: form.getHeaders() });
    m.reply(`🔗 *Link:* https://telegra.ph${data[0].src}`);
  }
};
