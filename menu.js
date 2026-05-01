export default {
  pattern: "menu",
  react: "👑",
  async function(conn, mek, m, ctx) {
    const menuText = `┏━━━━━━━━━━━━━━━━━━━━━━━━┓
┃   👑 *𝕃𝕌ℂ𝕀𝔽𝔼ℝ-𝕄𝔻 𝕍𝟚𝟞 𝕌𝕃𝕋𝕀𝕄𝔸𝕋𝔼* 👑   
┗━━━━━━━━━━━━━━━━━━━━━━━━┛

┌───────────────────────┐
│ 👤 *Owner:* Sandaru Udan
│ 💠 *Team:* Luviya MD Team
│ 🌐 *Status:* Active / Online
│ 🛠️ *Ver:* 2.6.0 (Global)
└───────────────────────┘

┏━⊱ *🎬 MOVIE SEARCH* ⊰━┓
┃ ◈ .ss <name>  ➵ Sinhala Sub
┃ ◈ .s <name>   ➵ Fast Search
┗━━━━━━━━━━━━━━━━━━━━━━━┛

┏━⊱ *📥 DOWNLOADERS* ⊰━┓
┃ ◈ .tt <url>   ➵ TikTok Downloader
┃ ◈ .sdl        ➵ Status Downloader
┃ ◈ .video <url> ➵ Video Downloader
┃ ◈ .vv         ➵ Save View-Once
┗━━━━━━━━━━━━━━━━━━━━━━━┛

┏━⊱ *🛠️ TOOLS & UTILS* ⊰━┓
┃ ◈ .ai <query> ➵ Gemini AI Chat
┃ ◈ .pp <@tag>  ➵ Get Profile Pic
┃ ◈ .pp -p      ➵ Get PP to DM
┃ ◈ .setpf      ➵ Change Bot DP
┃ ◈ .ping       ➵ Check Speed
┃ ◈ .alive      ➵ Check Status
┗━━━━━━━━━━━━━━━━━━━━━━━┛

┏━⊱ *👑 OWNER ONLY* ⊰━┓
┃ ◈ .setpf (Reply Image)
┗━━━━━━━━━━━━━━━━━━━━━━━┛

*---------------------------------------*
*Aluth bota chora una, Lucifer pora una...*
*Hema botama ekai kiyala therenakota okkotama hika una 😒🔥*
*---------------------------------------*

© 𝟚𝟘𝟚𝟔 𝕃𝕌𝕍𝕀𝕐𝔸 𝕄𝔻 𝕋𝔼𝔸𝕄`;

    await conn.sendMessage(ctx.from, {
      image: { url: "https://i.postimg.cc/j5hKdP7b/IMG-20260425-WA0432-2.jpg" }, // ඔයා දුන්න image එක
      caption: menuText
    }, { quoted: mek });
  }
};
