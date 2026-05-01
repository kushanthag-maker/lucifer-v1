import express from 'express';
import { 
    makeWASocket, 
    useMultiFileAuthState, 
    fetchLatestBaileysVersion, 
    delay 
} from "@whiskeysockets/baileys";
import pino from "pino";
import fs from "fs-extra";
import path from "path";

const app = express();
const port = process.env.PORT || 8000;

const tempSessionDir = path.join(process.cwd(), 'temp_sessions');
if (!fs.existsSync(tempSessionDir)) {
    fs.mkdirSync(tempSessionDir);
}

app.get('/', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'index.html'));
});

app.get('/pairing', async (req, res) => {
    let num = req.query.number;
    if (!num) return res.json({ error: "NULL" });

    num = num.replace(/[^0-9]/g, '');

    const sessionID = `session_${num}_${Date.now()}`;
    const sessionPath = path.join(tempSessionDir, sessionID);
    
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const { version } = await fetchLatestBaileysVersion();

    const conn = makeWASocket({
        auth: state,
        version,
        printQRInTerminal: false,
        logger: pino({ level: "silent" }),
        
        // FIX 1: Hardcoded Browser Array for Faster Recognition
        browser: ["Ubuntu", "Chrome", "20.0.04"],
        
        // FIX 2 & 3: Optimized Handshake and Timeout
        syncFullHistory: false, 
        markOnlineOnConnect: true, 
        connectTimeoutMs: 15000, 
        defaultQueryTimeoutMs: 15000, 
        keepAliveIntervalMs: 10000,
        generateHighQualityLinkPreview: false,
        msgRetryCounterCache: pino({ level: "silent" }),
    });

    try {
        if (!conn.authState.creds.registered) {
            await delay(1500);
            let code = await conn.requestPairingCode(num);
            if (code && !res.headersSent) {
                res.json({ code: code });
            }
        }
    } catch (e) {
        if (!res.headersSent) res.json({ error: "ERROR" });
    }

    conn.ev.on('creds.update', saveCreds);

    conn.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === 'open') {
            try {
                await conn.sendMessage(conn.user.id, { text: "CONNECTED" });
                setTimeout(async () => {
                    await conn.logout();
                    if (fs.existsSync(sessionPath)) fs.removeSync(sessionPath);
                }, 5000);
            } catch (err) {}
        }

        if (connection === 'close') {
            const reason = lastDisconnect?.error?.output?.statusCode;
            if (reason !== 401) {
                setTimeout(() => {
                    if (fs.existsSync(sessionPath)) fs.removeSync(sessionPath);
                }, 3000);
            }
        }
    });
});

app.listen(port, "0.0.0.0", () => {});
