import express from 'express';
import { 
    makeWASocket, 
    useMultiFileAuthState, 
    fetchLatestBaileysVersion, 
    delay 
} from "@whiskeysockets/baileys";
import pino from "pino";
import fs from "fs-extra";
import path from "path";

const app = express();
const port = process.env.PORT || 8000;

// සයිට් එක පෙන්වීමට
app.get('/', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'index.html'));
});

app.get('/pairing', async (req, res) => {
    let num = req.query.number;
    if (!num) return res.json({ error: "Please provide a phone number!" });

    num = num.replace(/[^0-9]/g, '');

    // තාවකාලික ෆෝල්ඩර් පද්ධතිය
    const sessionID = `session_${num}_${Date.now()}`;
    const sessionPath = path.join(process.cwd(), 'temp_sessions', sessionID);
    
    if (!fs.existsSync(path.join(process.cwd(), 'temp_sessions'))) {
        fs.mkdirSync(path.join(process.cwd(), 'temp_sessions'));
    }

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const { version } = await fetchLatestBaileysVersion();

    const conn = makeWASocket({
        auth: state,
        version,
        printQRInTerminal: false,
        logger: pino({ level: "silent" }),
        // ස්ථාවර පයිරින් සඳහා බ්‍රවුසරය
        browser: ["Ubuntu", "Chrome", "20.0.04"]
    });

    // 1. Pairing Code එක ලබාගැනීම
    try {
        if (!conn.authState.creds.registered) {
            await delay(3000);
            let code = await conn.requestPairingCode(num);
            
            if (code && !res.headersSent) {
                res.json({ code: code });
            }
        }
    } catch (error) {
        console.error("Pairing Error:", error);
        if (!res.headersSent) res.json({ error: "Failed to get pairing code." });
    }

    conn.ev.on('creds.update', saveCreds);

    // 2. සම්බන්ධ වූ පසු Success Message එක යවන ලොජික් එක
    conn.ev.on('connection.update', async (update) => {
        const { connection } = update;

        if (connection === 'open') {
            try {
                console.log(`Successfully linked with: ${num}`);

                // යුසර්ට යන සාර්ථකත්වයේ පණිවිඩය (Success Message)
                const successMsg = `
*✅ LUCIFER-MD V26 LINKED!*

*Device:* ${num}
*Status:* Connected Successfully
*Team:* Luviya MD Team & Team Grim-X

> *Regards, Sandaru Udan*
                `;

                await conn.sendMessage(conn.user.id, { text: successMsg });

                // සෙෂන් එක ඉවර නිසා තත්පර 10කින් ලොග් අවුට් වී ෆෝල්ඩරය මකා දැමීම
                setTimeout(async () => {
                    await conn.logout();
                    if (fs.existsSync(sessionPath)) fs.removeSync(sessionPath);
                }, 10000);

            } catch (e) {
                console.log("Message Sending Error:", e);
            }
        }

        if (connection === 'close') {
            // අවුලක් වුණොත් ක්ලීන් කරන්න
            setTimeout(() => {
                if (fs.existsSync(sessionPath)) fs.removeSync(sessionPath);
            }, 5000);
        }
    });
});

app.listen(port, "0.0.0.0", () => {
    console.log(`🚀 Lucifer-MD V26 Pairing Server is online on port ${port}`);
});
