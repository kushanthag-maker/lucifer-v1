import express from 'express';
import { makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } from "@whiskeysockets/baileys";
import pino from "pino";
import fs from "fs-extra";
import path from "path";

const app = express();
const port = process.env.PORT || 8000;

app.use(express.static('public'));

app.get('/pairing', async (req, res) => {
    let num = req.query.number;
    if (!num) return res.json({ error: "Number required!" });

    // එක් එක් යුසර්ට වෙනම තාවකාලික ෆෝල්ඩරයක් (restart වුණාම මැකෙනවා)
    const sessionPath = `./temp_sessions/${num}_${Date.now()}`;
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const { version } = await fetchLatestBaileysVersion();

    const conn = makeWASocket({
        auth: state,
        version,
        printQRInTerminal: false,
        logger: pino({ level: "silent" }),
        browser: ["Chrome (Linux)", "", ""]
    });

    if (!conn.authState.creds.registered) {
        setTimeout(async () => {
            try {
                let code = await conn.requestPairingCode(num);
                res.json({ code: code });
                
                // Code එක දුන්නට පස්සේ තාවකාලිකව ෆෝල්ඩර් එක අයින් කරන්න (security සඳහා)
                setTimeout(() => fs.removeSync(sessionPath), 60000); 
            } catch (e) {
                res.json({ error: "Try again later!" });
            }
        }, 3000);
    }
});

app.listen(port, () => console.log(`Server running on port ${port}`));
