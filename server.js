import express from 'express';
import { 
    makeWASocket, 
    useMultiFileAuthState, 
    fetchLatestBaileysVersion, 
    delay,
    DisconnectReason
} from "@whiskeysockets/baileys";
import pino from "pino";
import fs from "fs-extra";
import path from "path";
import { GoogleGenerativeAI } from "@google/genai";

const app = express();
const port = process.env.PORT || 8000;

// Gemini AI Setup (ඔයාගේ API Key එක මෙතනට දාන්න)
const genAI = new GoogleGenerativeAI("ඔයාගේ_GEMINI_API_KEY_එක");

const tempSessionDir = path.join(process.cwd(), 'temp_sessions');
if (!fs.existsSync(tempSessionDir)) fs.mkdirSync(tempSessionDir);

app.get('/', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'index.html'));
});

app.get('/pairing', async (req, res) => {
    let num = req.query.number;
    if (!num) return res.json({ error: "No number" });

    num = num.replace(/[^0-9]/g, '');
    const sessionID = `LUCIFER_${uuidv4().split('-')[0]}`;
    const sessionPath = path.join(tempSessionDir, sessionID);
    
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const { version } = await fetchLatestBaileysVersion();

    const conn = makeWASocket({
        auth: state,
        version,
        printQRInTerminal: false,
        logger: pino({ level: "silent" }),
        // FIX: නව Baileys version එකට ගැළපෙන Browser array එක
        browser: ["Ubuntu", "Chrome", "20.0.04"], 
        syncFullHistory: false,
        markOnlineOnConnect: true,
        connectTimeoutMs: 30000
    });

    try {
        if (!conn.authState.creds.registered) {
            await delay(3000);
            const code = await conn.requestPairingCode(num);
            if (code && !res.headersSent) {
                res.json({ code: code });
            }
        }
    } catch (e) {
        console.log("Pairing Error:", e);
        if (!res.headersSent) res.json({ error: "Pairing Failed" });
    }

    conn.ev.on('creds.update', saveCreds);

    conn.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'open') {
            await conn.sendMessage(conn.user.id, { text: "*LUCIFER-MD V26 CONNECTED*" });
            setTimeout(async () => {
                await conn.logout();
                if (fs.existsSync(sessionPath)) fs.removeSync(sessionPath);
            }, 10000);
        }
        if (connection === 'close') {
            const reason = lastDisconnect?.error?.output?.statusCode;
            if (reason !== DisconnectReason.loggedOut) {
                if (fs.existsSync(sessionPath)) fs.removeSync(sessionPath);
            }
        }
    });
});

app.listen(port, "0.0.0.0", () => {
    console.log(`Server started on ${port}`);
});
