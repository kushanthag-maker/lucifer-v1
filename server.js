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

// index.html එක Root එකේ තියෙන නිසා ඒක පෙන්වීමට
app.get('/', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'index.html'));
});

app.get('/pairing', async (req, res) => {
    let num = req.query.number;
    if (!num) return res.json({ error: "Number required!" });

    // සෑම පයිරින් වාරයකටම අලුත් තාවකාලික සෙෂන් එකක්
    const sessionName = `temp_pair_${num}_${Date.now()}`;
    const sessionPath = path.join(process.cwd(), sessionName);
    
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const { version } = await fetchLatestBaileysVersion();

    const conn = makeWASocket({
        auth: state,
        version,
        printQRInTerminal: false,
        logger: pino({ level: "silent" }),
        browser: Browsers.ubuntu("Chrome") 
    });

    // මෙතන තමයි කලින් වැරදිලා තිබුණේ - connection update එක නිවැරදිව හදා ඇත
    conn.ev.on('connection.update', async (update) => {
        const { connection } = update;

        if (connection === 'open') {
            try {
                await delay(3000); 
                let code = await conn.requestPairingCode(num);
                
                if (!res.headersSent) {
                    res.json({ code: code });
                }

                setTimeout(async () => {
                    await conn.logout();
                    if (fs.existsSync(sessionPath)) fs.removeSync(sessionPath);
                }, 15000);

            } catch (e) {
                console.error("Pairing Error:", e);
                if (!res.headersSent) res.json({ error: "Failed to get code. Try again." });
            }
        }
    }); // මෙතන Bracket එක වහන්න අමතක වෙලා තිබුණා

    conn.ev.on('creds.update', saveCreds);

    // Timeout එකක් තැබීම
    setTimeout(() => {
        if (!res.headersSent) {
            res.json({ error: "Connection timed out. Please refresh the page." });
        }
    }, 40000);
});

// Heroku සඳහා "0.0.0.0" අනිවාර්යයෙන්ම එකතු කළා
app.listen(port, "0.0.0.0", () => {
    console.log(`
    ===========================================
    LUCIFER-MD NEON SERVER STARTED
    Port: ${port}
    Status: Online & Fixed
    ===========================================
    `);
});
