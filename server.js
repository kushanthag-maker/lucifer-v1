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
import axios from "axios";
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(express.json());
const port = process.env.PORT || 8000;

// Configs
const BOT_API_KEY = process.env.BOT_API_KEY || "LUCIFER-V26-KEY";

const tempSessionDir = path.join(process.cwd(), 'temp_sessions');
if (!fs.existsSync(tempSessionDir)) fs.mkdirSync(tempSessionDir);

// Helper: Webhook Sender
async function sendWebhook(url, auth, payload) {
    try {
        await axios.post(url, payload, {
            headers: { Authorization: auth },
        });
    } catch (err) {
        console.error(`Webhook Error: ${err.message}`);
    }
}

app.get('/', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'index.html'));
});

// POST /api/pair - logic based on your request
app.post('/api/pair', async (req, res) => {
    const apiKey = req.headers["x-api-key"];
    const webhookUrl = req.headers["x-webhook-url"];
    const webhookAuth = req.headers["x-webhook-auth"];
    const { phoneNumber } = req.body;

    if (apiKey !== BOT_API_KEY) return res.status(403).json({ success: false, message: "Invalid API Key" });
    if (!phoneNumber || !webhookUrl) return res.status(400).json({ success: false, message: "Missing params" });

    const digits = phoneNumber.replace(/\D/g, "");
    const sessionId = uuidv4();
    const sessionPath = path.join(tempSessionDir, sessionId);

    res.status(202).json({ success: true, message: "started", sessionId });

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const { version } = await fetchLatestBaileysVersion();

    const conn = makeWASocket({
        auth: state,
        version,
        logger: pino({ level: "silent" }),
        browser: ["Ubuntu", "Chrome", "20.0.04"],
        syncFullHistory: false,
        markOnlineOnConnect: true
    });

    conn.ev.on('creds.update', saveCreds);

    // Get Pairing Code
    try {
        if (!conn.authState.creds.registered) {
            await delay(3000);
            const code = await conn.requestPairingCode(digits);
            await sendWebhook(webhookUrl, webhookAuth, {
                type: "pairing_code",
                code,
                sessionId
            });
        }
    } catch (err) {
        await sendWebhook(webhookUrl, webhookAuth, { type: "error", message: err.message, sessionId });
    }

    // Connection Monitor
    conn.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === 'open') {
            // Stability Wait (5s) as per your logic
            await delay(5000);
            await sendWebhook(webhookUrl, webhookAuth, {
                type: "pair_complete",
                sessionId
            });
            
            // Auto logout to save Heroku resources
            setTimeout(async () => {
                await conn.logout();
                if (fs.existsSync(sessionPath)) fs.removeSync(sessionPath);
            }, 5000);
        }

        if (connection === 'close') {
            const reason = lastDisconnect?.error?.output?.statusCode;
            if (reason !== 401) {
                if (fs.existsSync(sessionPath)) fs.removeSync(sessionPath);
            }
        }
    });
});

app.listen(port, "0.0.0.0", () => {
    console.log(`LUCIFER-MD API SERVER RUNNING ON PORT ${port}`);
});
