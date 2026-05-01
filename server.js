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
        // Desktop Chrome Browser එකක් විදියට පෙන්වීම ලොගින් ස්පීඩ් එක වැඩි කරයි
        browser: Browsers.ubuntu("Chrome"),
        
        // --- FAST LOGIN SETTINGS ---
        syncFullHistory: false, 
        markOnlineOnConnect: false, // ලොග් වෙන වෙලාවට ඔන්ලයින් පෙන්වීම ඕන නැහැ (වේගය වැඩි කරයි)
        connectTimeoutMs: 30000, // තත්පර 30ක උපරිම කාලයක්
        defaultQueryTimeoutMs: 30000, 
        keepAliveIntervalMs: 30000,
        generateHighQualityLinkPreview: false,
        msgRetryCounterCache: pino({ level: "silent" }), // Retry මැසේජ් පාලනය
    });

    try {
        // ලියාපදිංචි වී නොමැති නම් පමණක් කෝඩ් එක ඉල්ලන්න
        if (!conn.authState.creds.registered) {
            await delay(2000); // ඩේටා ලෝඩ් වෙන්න පොඩි වෙලාවක්
            let code = await conn.requestPairingCode(num);
            
            if (code && !res.headersSent) {
                res.json({ code: code });
            }
        }
    } catch (e) {
        console.error("Pairing Error:", e);
        if (!res.headersSent) res.json({ error: "Request failed. Try again!" });
    }

    conn.ev.on('creds.update', saveCreds);

    conn.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === 'open') {
            try {
                console.log(`[LUCIFER-MD] Connected: ${num}`);
                
                const successMsg = `
*✅ LUCIFER-MD V26 CONNECTED!*

*Device:* ${num}
*Status:* High Speed Login Active ⚡

> *Regards, Sandaru Udan*
                `;

                await conn.sendMessage(conn.user.id, { text: successMsg });

                // මැසේජ් එක ගිය සැනින් ලොග් අවුට් වීම (සර්වර් එකේ බර අඩු කිරීමට)
                setTimeout(async () => {
                    await conn.logout();
                    if (fs.existsSync(sessionPath)) fs.removeSync(sessionPath);
                }, 8000);

            } catch (err) {
                console.log("Success Msg Error:", err);
            }
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
    console.log(`🚀 LUCIFER-MD V26: High Speed Server Started on ${port}`);
});
