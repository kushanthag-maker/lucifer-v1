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
        // FIX 1: ඔයා කිව්වා වගේම Browser එක Ubuntu Chrome ලෙස ස්ථාවර කළා
        browser: Browsers.ubuntu("Chrome") 
    });

    // FIX 2: Connection එක 'open' වෙනකම් බලන් ඉඳලා කෝඩ් එක ඉල්ලන ලොජික් එක
    conn.ev.on('connection.update', async (update) => {
        const { connection } = update;

        if (connection === 'open') {
            try {
                // සර්වර් එක ස්ථාවර වීමට තත්පර 3ක් රැඳී සිටීම
                await delay(3000); 
                
                // WhatsApp සර්වර් එකෙන් Pairing Code එක ඉල්ලීම
                let code = await conn.requestPairingCode(num);
                
                if (!res.headersSent) {
                    res.json({ code: code });
                }

                // කෝඩ් එක දුන්නට පසු සෙෂන් එක මකා දැමීම
                setTimeout(async () => {
                    await conn.logout();
                    if (fs.existsSync(sessionPath)) fs.removeSync(sessionPath);
                }, 15000);

            } catch (e) {
                console.error("Pairing Error:", e);
                if (!res.headersSent) res.json({ error: "Failed to get code. Try again." });
            }
        }
    });

    conn.ev.on('creds.update', saveCreds);

    // සර්වර් එකට සම්බන්ධ වීමට බැරි වුණොත් Timeout එකක් තැබීම
    setTimeout(() => {
        if (!res.headersSent) {
            res.json({ error: "Connection timed out. Please refresh the page." });
        }
    }, 40000);
});

app.listen(port, () => {
    console.log(`
    ===========================================
    LUCIFER-MD NEON SERVER STARTED
    Port: ${port}
    Status: Fixes Applied
    ===========================================
    `);
});
