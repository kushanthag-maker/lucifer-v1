import express from 'express';
import { makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } from "@whiskeysockets/baileys";
import pino from "pino";
import fs from "fs-extra";
import path from "path";

const app = express();
const port = process.env.PORT || 8000;

// ඔයාගේ index.html එක එළියේ (Root) තියෙන නිසා මේ විදියට හදමු
app.get('/', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'index.html'));
});

app.get('/pairing', async (req, res) => {
    let num = req.query.number;
    if (!num) return res.json({ error: "Number required!" });

    const sessionPath = `./temp_sessions/${num}`;
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
                setTimeout(() => fs.removeSync(sessionPath), 60000); 
            } catch (e) {
                res.json({ error: "Try again later!" });
            }
        }, 3000);
    }
});

app.listen(port, () => console.log(`Server running on port ${port}`));
