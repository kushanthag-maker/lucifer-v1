import express from 'express';
import { makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, Browsers } from "@whiskeysockets/baileys";
import pino from "pino";
import fs from "fs-extra";
import path from "path";

const app = express();
const port = process.env.PORT || 8000;

app.get('/', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'index.html'));
});

app.get('/pairing', async (req, res) => {
    let num = req.query.number;
    if (!num) return res.json({ error: "Number required!" });

    // එක් එක් යුසර්ට අද්විතීය සෙෂන් එකක් හදමු
    const sessionName = `temp_${num}_${Math.floor(Math.random() * 10000)}`;
    const sessionPath = path.join(process.cwd(), sessionName);
    
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const { version } = await fetchLatestBaileysVersion();

    const conn = makeWASocket({
        auth: state,
        version,
        printQRInTerminal: false,
        logger: pino({ level: "silent" }),
        // මෙතන බ්‍රවුසර් එක නිවැරදිව දීම පයිරින් කෝඩ් එකට ඉතා වැදගත්
        browser: Browsers.macOS("Desktop") 
    });

    if (!conn.authState.creds.registered) {
        try {
            // WhatsApp සර්වර් එකට රික්වෙස්ට් එක යැවීම
            let code = await conn.requestPairingCode(num);
            
            // කෝඩ් එක ලැබුණු ගමන් සයිට් එකට response එක යවනවා
            if (code) {
                res.json({ code: code });
            } else {
                res.json({ error: "Could not generate code. Try again." });
            }

            // සෙෂන් එක පාවිච්චි නොවන නිසා විනාඩියකින් මකා දැමීම
            setTimeout(() => {
                conn.logout();
                fs.removeSync(sessionPath);
            }, 60000);

        } catch (e) {
            console.error(e);
            res.json({ error: "Service busy. Please wait 1-2 minutes." });
        }
    }
});

app.listen(port, () => console.log(`Neon Server running on port ${port}`));
