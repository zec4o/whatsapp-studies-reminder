import { default as makeWASocket, DisconnectReason, useMultiFileAuthState, WASocket } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import qrcode from 'qrcode-terminal';
import { MessageScheduler } from './MessageScheduler';
import dotenv from 'dotenv';

dotenv.config();

interface WhatsAppBotConfig {
    authInfoPath: string;
    recipientJid: string;
    timezone: string;
}

export class WhatsAppBot {
    private config: WhatsAppBotConfig;
    private sock: WASocket | null = null;
    private scheduler: MessageScheduler;

    constructor(config: WhatsAppBotConfig) {
        this.config = config;
        this.scheduler = new MessageScheduler(config.timezone);
    }

    async connect() {
        const { state, saveCreds } = await useMultiFileAuthState(this.config.authInfoPath);
        this.sock = makeWASocket({ auth: state });

        this.sock.ev.on('creds.update', saveCreds);
        this.sock.ev.on('connection.update', this.handleConnectionUpdate.bind(this));
        this.sock.ev.on('messages.upsert', this.handleMessageUpsert.bind(this));
    }

    private handleConnectionUpdate(update: any) {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            const error = lastDisconnect.error;
            console.error('Connection closed due to', error);
            if (error instanceof Boom) {
                console.error('Boom error details:', error.output);
            }
            const shouldReconnect = error instanceof Boom && error.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Reconnecting:', shouldReconnect);
            if (shouldReconnect) {
                setTimeout(() => this.connect(), 5000); // Retry connection after 5 seconds
            }
        } else if (connection === 'open') {
            console.log('Opened connection');
        }
    }

    private async handleMessageUpsert(m: any) {
        try {
            console.log('Received message:', m.messages[0].message.conversation);
        } catch (error) {
            console.error('Failed to handle message upsert:', error);
        }
    }

    public async sendMessage(text: string) {
        if (this.sock) {
            const recipientJid = `${this.config.recipientJid}@s.whatsapp.net`;
            try {
                await this.sock.sendMessage(recipientJid, { text });
                console.log('Message sent:', text);
            } catch (error) {
                console.error('Failed to send message:', error);
            }
        }
    }

    public scheduleMessage(time: Date, message: string) {
        this.scheduler.scheduleMessage(time, async () => {
            await this.sendMessage(message);
        });
    }
}