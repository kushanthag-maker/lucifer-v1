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

// Sessions තාවකාලිකව තියාගන්න folder එකක් හදනවා
const tempSessionDir = path.join(process.cwd(), 'temp_sessions');
if (!fs.existsSync(tempSessionDir)) {
    fs.mkdirSync(tempSessionDir);
}

app.get('/', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'index.html'));
});

app.get('/pairing', async (req, res) => {
    let num = req.query.number;
    if (!num) return res.json({ error: "Please provide a phone number!" });

    // අංකය පිරිසිදු කිරීම
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
        browser: ["Ubuntu", "Chrome", "20.0.04"],
        
        // --- ඔයා දුන්න වේගය වැඩි කරන Turbo Settings ---
        syncFullHistory: false, 
        markOnlineOnConnect: true,
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 0,
        keepAliveIntervalMs: 10000,
        generateHighQualityLinkPreview: false,
    });

    // Pairing Code එක ඉල්ලීමේ කොටස
    try {
        if (!conn.authState.creds.registered) {
            await delay(3000); // Socket එක සූදානම් වෙන්න තත්පර 3ක්
            let code = await conn.requestPairingCode(num);
            
            if (code && !res.headersSent) {
                res.json({ code: code });
            }
        }
    } catch (e) {
        console.error("Pairing Error:", e);
        if (!res.headersSent) res.json({ error: "Request timed out. Please try again." });
    }

    conn.ev.on('creds.update', saveCreds);

    // Connection එක ගැන විමසිල්ලෙන් සිටීම
    conn.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === 'open') {
            try {
                console.log(`[LUCIFER-MD] Connected: ${num}`);
                
                // සාර්ථකව ලොග් වුණාම User ට යන මැසේජ් එක
                const successMsg = `
*✅ LUCIFER-MD V26 CONNECTED!*

*Device:* ${num}
*Mode:* Turbo Speed ⚡
*Team:* Luviya MD Team & Team Grim-X

> *Regards, Sandaru Udan*
                `;

                await conn.sendMessage(conn.user.id, { text: successMsg });

                // සෙෂන් එක ඉවර නිසා සර්වර් එක ක්ලීන් කිරීම
                setTimeout(async () => {
                    await conn.logout();
                    if (fs.existsSync(sessionPath)) fs.removeSync(sessionPath);
                }, 10000);

            } catch (err) {
                console.log("Success Msg Error:", err);
            }
        }

        if (connection === 'close') {
            const reason = lastDisconnect?.error?.output?.statusCode;
            if (reason !== 401) {
                // අවුලක් වුණොත් සෙෂන් එක මකා දැමීම
                setTimeout(() => {
                    if (fs.existsSync(sessionPath)) fs.removeSync(sessionPath);
                }, 5000);
            }
        }
    });
});

app.listen(port, "0.0.0.0", () => {
    console.log(`
--------------------------------------------------
🚀 LUCIFER-MD V26 PAIRING SERVER STARTED
⚡ Port: ${port}
🛠 Status: Turbo Mode & Success Msg Active
--------------------------------------------------
    `);
});
