import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

const calendar = google.calendar('v3');

export class GoogleCalendar {
    private auth: OAuth2Client;

    constructor(auth: OAuth2Client) {
        this.auth = auth;
    }

    async getTodayEvents() {
        const res = await calendar.events.list({
            auth: this.auth,
            calendarId: 'primary',
            timeMin: (new Date()).toISOString(),
            maxResults: 10,
            singleEvents: true,
            orderBy: 'startTime',
        });

        const events = res.data.items;
        if (events?.length) {
            console.log('Upcoming 10 events:');
            events.map((event, i) => {
                const start = event.start?.dateTime || event.start?.date;
                console.log(`${start} - ${event.summary}`);
            });
        } else {
            console.log('No upcoming events found.');
        }
        return events;
    }

    async createEvent(event: any) {
        const res = await calendar.events.insert({
            auth: this.auth,
            calendarId: 'primary',
            requestBody: event,
        });
        console.log('Event created: %s', res.data.htmlLink);
    }

    async createDailyEvents(studySchedule: any[]) {
        try {
            const today = new Date().getDay();
            const schedule = studySchedule.find(schedule => schedule.day === today);
    
            console.log('Creating daily events for today:', today);
    
            if (schedule) {
                for (const task of schedule.tasks) {
                    const startTime = new Date();
                    const [hours, minutes] = task.time.split(':').map(Number);
                    startTime.setHours(hours, minutes, 0, 0);
    
                    const endTime = new Date(startTime.getTime() + task.duration * 60000);
    
                    const event = {
                        summary: task.description,
                        start: {
                            dateTime: startTime.toISOString(),
                            timeZone: 'America/Sao_Paulo',
                        },
                        end: {
                            dateTime: endTime.toISOString(),
                            timeZone: 'America/Sao_Paulo',
                        },
                    };
    
                    // Assuming you have a method to create the event in the calendar
                    await this.createEvent(event);
                    console.log('Event created:', event);
                }
            } else {
                console.log('No schedule found for today.');
            }
        } catch (error) {
            console.error('Error creating daily events:', error);
        }
    }
}