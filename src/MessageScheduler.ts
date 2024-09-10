import cron from 'node-cron';

export class MessageScheduler {
    private timezone: string;

    constructor(timezone: string) {
        this.timezone = timezone;
    }

    scheduleMessage(time: Date, callback: () => void) {
        const cronTime = `${time.getMinutes()} ${time.getHours()} ${time.getDate()} ${time.getMonth() + 1} *`;
        cron.schedule(cronTime, callback, {
            scheduled: true,
            timezone: this.timezone,
        });
    }
}