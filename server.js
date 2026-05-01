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

// Sessions තාවකාලිකව ගබඩා කරන තැන
const authFolder = 'auth_info';

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
        // පයිරින් කෝඩ් එක හරියටම එන්න නම් මේ Browser එක අනිවාර්යයි
        browser: ["Ubuntu", "Chrome", "20.0.04"]
    });

    // --- PAIRING CODE ENDPOINT ---
    app.get('/pairing', async (req, res) => {
        let num = req.query.number;
        if (!num) return res.json({ error: "Please provide a phone number." });

        num = num.replace(/[^0-9]/g, '');

        if (!conn.authState.creds.registered) {
            console.log(`🔔 Generating Pairing Code for: ${num}`);
            
            // ඔයාගේ කෝඩ් එකේ තිබ්බ විදියටම stability එකට තත්පර කිහිපයක් රැඳී සිටීම
            await delay(8000); 
            
            try {
                const code = await conn.requestPairingCode(num);
                if (!res.headersSent) {
                    res.json({ code: code });
                }
            } catch (err) {
                console.error("Pairing Error:", err);
                if (!res.headersSent) res.json({ error: "Pairing Request Failed" });
            }
        } else {
            res.json({ message: "Already Logged In" });
        }
    });

    conn.ev.on('creds.update', saveCreds);

    conn.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'open') {
            console.log('✅ LUCIFER-MD CONNECTED SUCCESSFULLY');
        }
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startLucifer();
        }
    });

    // Default route
    app.get('/', (req, res) => {
        res.send("LUCIFER-MD PAIRING SERVER IS RUNNING...");
    });
}

app.listen(port, () => {
    console.log(`Server is live on port ${port}`);
    startLucifer();
});
