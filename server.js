import express from 'express';
import {
    default: makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    delay,
    DisconnectReason,
    Browsers
} from "@whiskeysockets/baileys";
import pino from "pino";
import fs from "fs-extra";
import path from "path";

const app = express();
const port = process.env.PORT || 8000;

// Sessions storage
const authFolder = 'auth_info';
if (!fs.existsSync(authFolder)) fs.mkdirSync(authFolder);

async function startLucifer() {
    const { state, saveCreds } = await useMultiFileAuthState(authFolder);
    const { version } = await fetchLatestBaileysVersion();

    const conn = makeWASocket({
        version,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
        },
        printQRInTerminal: false,
        logger: pino({ level: "silent" }),
        browser: ["Ubuntu", "Chrome", "20.0.04"] 
    });

    // --- PAIRING API ---
    app.get('/get_pairing', async (req, res) => {
        let num = req.query.number;
        if (!num) return res.json({ error: "Number missing!" });
        num = num.replace(/[^0-9]/g, '');

        if (!conn.authState.creds.registered) {
            await delay(8000); // ඔයා දීපු stability delay එක
            try {
                const code = await conn.requestPairingCode(num);
                if (!res.headersSent) res.json({ code: code });
            } catch (err) {
                if (!res.headersSent) res.json({ error: "Failed to generate code" });
            }
        } else {
            res.json({ message: "Already Connected" });
        }
    });

    conn.ev.on('creds.update', saveCreds);
    conn.ev.on('connection.update', (u) => {
        if (u.connection === 'close') startLucifer();
        if (u.connection === 'open') console.log("CONNECTED ✅");
    });
}

// Serve Frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'index.html'));
});

app.listen(port, () => {
    console.log(`Server live on ${port}`);
    startLucifer();
});
