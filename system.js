export default {
  pattern: "ping",
  react: "⚡",
  async function(conn, mek, m, ctx) {
    const start = Date.now();
    const { key } = await conn.sendMessage(ctx.from, { text: "🚀 Checking..." });
    await conn.sendMessage(ctx.from, { text: `⚡ *Speed:* ${Date.now() - start}ms`, edit: key });
  }
};
