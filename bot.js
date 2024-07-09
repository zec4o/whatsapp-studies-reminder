const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const qrcode = require('qrcode-terminal');
const cron = require('node-cron');
require('dotenv').config();

// Function to get the message based on the day of the week
function getMessageForDay(dayOfWeek) {
    switch (dayOfWeek) {
        case 0: // Sunday
            return "Go enjoy!!! 🌞";
        case 1: // Monday
            return "Today your study schedule is: Focus on finishing 1 chapter of Grokking Algorithms book 📚";
        case 2: // Tuesday
            return "Today, you're going to finish 5 topics of GitHub Foundations Certification 🎓";
        case 3: // Wednesday
            return "Today your plan is to work on 3 LeetCode algorithm challenges + 1 GitHub Foundation topic 💻";
        case 4: // Thursday
            return "Today, focus on finishing 1 chapter of Grokking Algorithms book and 1/2 chapter of Data Structures and Algorithms in JavaScript 📘";
        case 5: // Friday
            return "Your plan today is to focus on 1 LeetCode algorithm challenge and 1 chapter of Data Structures and Algorithms in JavaScript book 📖";
        case 6: // Saturday
            return "Today, focus on finishing 5 topics of GitHub Foundations Certification exam 📝";
        default:
            return "Have a great day!";
    }
}

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
    cron.schedule('0 8 * * 1-6', async () => {
        const dayOfWeek = new Date().getDay(); // Get current day of the week (0-6)
        const message = getMessageForDay(dayOfWeek);
        
        // Import recipientJid from .env file
        const recipientJid = `${process.env.recipientJid}@s.whatsapp.net`;
        
        await sock.sendMessage(recipientJid, { text: message });
        console.log('Scheduled message sent:', message);
    }, {
        scheduled: true,
        timezone: "America/Sao_Paulo"
    });

    // Schedule a job to send a message at 8 PM every day except Sundays
    cron.schedule('0 20 * * 1-6', async () => {
        const recipientJid = `${process.env.recipientJid}@s.whatsapp.net`;
        await sock.sendMessage(recipientJid, { text: "How's it going? Remember to check your progress today! 🚀" });
        console.log('Evening check-in message sent!');
    }, {
        scheduled: true,
        timezone: "America/Sao_Paulo"
    });
}

connectToWhatsApp();
