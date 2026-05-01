import express from 'express';
import { 
    makeWASocket, 
    useMultiFileAuthState, 
    fetchLatestBaileysVersion, 
    Browsers, 
    delay 
} from "@whiskeysockets/baileys";
import pino from "pino";
import fs from "fs-extra";
import path from "path";

const app = express();
const port = process.env.PORT || 8000;

// Temporary sessions directory setup
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

    // Clean phone number format
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
        
        // පයිරින් කෝඩ් එක නිවැරදි වීමට සහ වේගවත් වීමට Ubuntu Chrome පාවිච්චි කරයි
        browser: Browsers.ubuntu("Chrome"),
        
        // --- Turbo & Login Fix Settings ---
        syncFullHistory: false, 
        markOnlineOnConnect: true,
        connectTimeoutMs: 30000,
        defaultQueryTimeoutMs: 30000, 
        keepAliveIntervalMs: 10000,
        generateHighQualityLinkPreview: false,
        msgRetryCounterCache: pino({ level: "silent" }),
    });

    try {
        if (!conn.authState.creds.registered) {
            // Socket එක ස්ථාවර වීමට තත්පර 2ක් රැඳී සිටීම
            await delay(2000);
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
                // යුසර්ට සාර්ථක පණිවිඩයක් යැවීම
                await conn.sendMessage(conn.user.id, { 
                    text: "*✅ LUCIFER-MD V26 CONNECTED*\n\nYour session is ready for use." 
                });

                // ලොග් වූ පසු සර්වර් එකේ ඉඩ ඉතිරි කිරීමට සෙෂන් එක මකා දැමීම
                setTimeout(async () => {
                    await conn.logout();
                    if (fs.existsSync(sessionPath)) fs.removeSync(sessionPath);
                }, 10000);
            } catch (err) {}
        }

        if (connection === 'close') {
            const reason = lastDisconnect?.error?.output?.statusCode;
            if (reason !== 401) {
                setTimeout(() => {
                    if (fs.existsSync(sessionPath)) fs.removeSync(sessionPath);
                }, 5000);
            }
        }
    });
});

app.listen(port, "0.0.0.0", () => {
    // Console output for tracking
    console.log(`LUCIFER-MD PAIRING ACTIVE ON PORT ${port}`);
});
