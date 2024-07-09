const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const qrcode = require('qrcode-terminal');
const cron = require('node-cron');
require('dotenv').config();

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    const sock = makeWASocket({
        auth: state,
    });
    // Save the auth state whenever it updates
    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
            qrcode.generate(qr, { small: true }); // Display the QR code in terminal
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error instanceof Boom && lastDisconnect.error.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Connection closed due to', lastDisconnect.error, ', reconnecting', shouldReconnect);
            // Reconnect if not logged out
            if (shouldReconnect) {
                connectToWhatsApp();
            }
        } else if (connection === 'open') {
            console.log('Opened connection');
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        console.log('Received message:', m.messages[0].message.conversation);
    });

    // Schedule a job to send a message once a day
    cron.schedule('*/15 * * * * *', async () => {
        //import from .env the recipientJid 
        let id = process.env.recipientJid
        const recipientJid = `${id}@s.whatsapp.net`;
        await sock.sendMessage(recipientJid, { text: 'Teste, lembrete enviado de 15 em 15 segundos.' });
        console.log('Daily reminder sent!');
    }, {
        scheduled: true,
        timezone: "America/Sao_Paulo"
    });
}

connectToWhatsApp();
