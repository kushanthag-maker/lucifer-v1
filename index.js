import {
    makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion
} from "@whiskeysockets/baileys";
import pino from "pino";
import { Boom } from "@hapi/boom";
import fs from "fs";
import path from "path";

// බොට් ආරම්භයේදී පෙනෙන පණිවිඩය
console.log(`
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                                            ┃
┃   👑  LUCIFER-MD V26 ULTIMATE STARTED  👑   
┃      Developed by: Sandaru Udan            ┃
┃      Team: Luviya MD Team                  ┃
┃                                            ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
`);

async function startLucifer() {
    const { state, saveCreds } = await useMultiFileAuthState('session');
    const { version } = await fetchLatestBaileysVersion();

    const conn = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: true,
        logger: pino({ level: "silent" }),
        browser: ["LUCIFER-MD", "Safari", "3.0"]
    });

    // --- Commands Auto Loader Logic ---
    conn.commands = new Map();
    
    // එළියේ තියෙන .js ෆයිල්ස් පරීක්ෂා කර ලෝඩ් කිරීම
    const files = fs.readdirSync("./").filter(file => 
        file.endsWith(".js") && 
        file !== "index.js" && 
        file !== "server.js"
    );

    for (const file of files) {
        try {
            const command = await import(`./${file}`);
            if (command.default && command.default.pattern) {
                conn.commands.set(command.default.pattern, command.default);
                console.log(`✅ Loaded Command: ${file}`);
            }
        } catch (e) {
            console.log(`❌ Error loading ${file}: ${e.message}`);
        }
    }

    // --- Message Handling ---
    conn.ev.on("messages.upsert", async (chatUpdate) => {
        const mek = chatUpdate.messages[0];
        if (!mek.message) return;
        
        const from = mek.key.remoteJid;
        const body = (mek.message.conversation || mek.message.extendedTextMessage?.text || "").trim();
        const prefix = "."; // ඔයාට ඕන නම් මේක වෙනස් කරන්න පුළුවන්
        
        if (!body.startsWith(prefix)) return;
        
        const args = body.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();
        const q = args.join(" ");
        
        const cmd = conn.commands.get(commandName) || 
                    Array.from(conn.commands.values()).find(c => c.alias && c.alias.includes(commandName));

        if (cmd) {
            const ctx = { from, q, args };
            // සරල මට්ටමින් reply function එකක් හැදීම
            const m = {
                reply: (text) => conn.sendMessage(from, { text }, { quoted: mek }),
                react: (emoji) => conn.sendMessage(from, { react: { text: emoji, key: mek.key } })
            };
            
            try {
                await cmd.function(conn, mek, m, ctx);
            } catch (err) {
                console.error(err);
                m.reply("❌ Command Error!");
            }
        }
    });

    conn.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === "close") {
            const shouldReconnect = (new Boom(lastDisconnect?.error)?.output.statusCode !== DisconnectReason.loggedOut);
            if (shouldReconnect) startLucifer();
        } else if (connection === "open") {
            console.log("✅ LUCIFER-MD V26 IS ONLINE!");
        }
    });

    conn.ev.on("creds.update", saveCreds);
}

// බොට් එක සහ වෙබ් සර්වර් එක දෙකම එකවර පණගැන්වීමට:
import "./server.js"; 
startLucifer();
