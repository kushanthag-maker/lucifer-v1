import axios from 'axios';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { pipeline } from 'stream/promises';

const API_BASE = 'https://zazie-mvdl-apis.vercel.app/api/sinhalasub';
const TEMP_DIR = path.join(os.tmpdir(), 'sinhalasub-downloads');
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

const userStates = new Map();

export default {
    pattern: "ss",
    alias: ["s", "sinhalasub"],
    category: "Movie",
    react: "🎬",

    async function(conn, mek, m, ctx) {
        const query = ctx.q;
        if (!query) return m.reply("❌ Usage: .ss <movie name>");

        userStates.delete(ctx.from);
        m.reply(`🔍 Searching for *${query}*...`);

        try {
            const { data } = await axios.get(`${API_BASE}/search`, { params: { q: query } });
            const results = data?.results;
            if (!results || results.length === 0) return m.reply(`❌ No results for "${query}".`);

            const top5 = results.slice(0, 5);
            let msgText = `🎬 *SINHALASUB SEARCH* 🎬\n🔍 *Query:* ${query}\n\n`;
            top5.forEach((item, i) => { msgText += `${i + 1}. *${item.name}* (${item.year || 'N/A'})\n`; });
            msgText += `\n_Reply with the number to continue._`;

            userStates.set(ctx.from, { step: 'awaiting_movie', results: top5 });
            await conn.sendMessage(ctx.from, { text: msgText }, { quoted: mek });

        } catch (err) {
            m.reply(`⚠️ Search failed: ${err.message}`);
        }
    }
};

// මීළඟට Number Reply එක handle කිරීමට Bot ගේ Main index එකේ handleNumberReply ක්‍රියාත්මක විය යුතුය.
