import { GoogleCalendar } from './googleCalendar';
import { WhatsAppBot } from './WhatsappBot';
import { studySchedule } from './studySchedule';
import { getGoogleAuthClient } from './googleAuth';
import dotenv from 'dotenv';
import cron from 'node-cron';

dotenv.config();

async function main() {
    const googleAuth = await getGoogleAuthClient();
    const googleCalendar = new GoogleCalendar(googleAuth);
    const botConfig = {
        authInfoPath: 'auth_info',
        recipientJid: process.env.recipientJid || '',
        timezone: 'America/Sao_Paulo',
    };
    const whatsappBot = new WhatsAppBot(botConfig);

    await whatsappBot.connect();

    // Schedule a job to create daily events at the beginning of each day
    cron.schedule('0 0 * * *', async () => {
        await googleCalendar.createDailyEvents(studySchedule);
    });

    // Schedule a job to send WhatsApp messages 3 hours before each task in the study schedule
    cron.schedule('0 0 * * *', () => {
        const today = new Date().getDay();
        const schedule = studySchedule.find(schedule => schedule.day === today);

        if (!schedule) {
            console.log('No tasks scheduled for today.');
            return;
        }

        for (const task of schedule.tasks) {
            const [hours, minutes] = task.time.split(':').map(Number);
            const taskTime = new Date();
            taskTime.setHours(hours, minutes, 0, 0);

            const reminderTime = new Date(taskTime.getTime() - 3 * 60 * 60 * 1000); // 3 hours before task
            const message = `Reminder: ${task.description} at ${task.time}`;
            whatsappBot.scheduleMessage(reminderTime, message);
        }
    });
}

main();