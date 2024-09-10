import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import fs from 'fs';
import path from 'path';
import readline from 'readline';

const SCOPES = [
  "https://www.googleapis.com/auth/calendar.app.created",
  "https://www.googleapis.com/auth/calendar.calendarlist.readonly",
  "https://www.googleapis.com/auth/calendar.events.freebusy",
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.acls",
  "https://www.googleapis.com/auth/calendar.acls.readonly",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.calendarlist",
  "https://www.googleapis.com/auth/calendar.calendars",
  "https://www.googleapis.com/auth/calendar.calendars.readonly",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.events.owned"
];
const TOKEN_PATH = path.join(__dirname, '..', 'token.json');

export async function getGoogleAuthClient(): Promise<OAuth2Client> {
    const credentials = JSON.parse(fs.readFileSync('googleauth.json', 'utf8'));
    const { client_secret, client_id, redirect_uris } = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

    if (fs.existsSync(TOKEN_PATH)) {
        const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
        oAuth2Client.setCredentials(token);

        const currentTime = new Date().getTime();
        const tokenExpiryTime = (oAuth2Client.credentials.expiry_date || 0) - 60000;

        if (currentTime >= tokenExpiryTime) {
            try {
                const newToken = await oAuth2Client.refreshAccessToken();
                oAuth2Client.setCredentials(newToken.credentials);
                fs.writeFileSync(TOKEN_PATH, JSON.stringify(newToken.credentials));
            } catch (error) {
                if (error instanceof Error) {
                    throw new Error('Error refreshing access token: ' + error.message);
                } else {
                    throw new Error('Unknown error refreshing access token');
                }
            }
        }
    } else {
        await authenticate(oAuth2Client);
    }

    return oAuth2Client;
}

async function authenticate(oAuth2Client: OAuth2Client) {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
    });
    console.log('Authorize this app by visiting this url:', authUrl);

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    const code = await new Promise<string>((resolve) => {
        rl.question('Enter the code from that page here: ', (code) => {
            rl.close();
            resolve(code);
        });
    });

    const token = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(token.tokens);
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(token.tokens));
    console.log('Token stored to', TOKEN_PATH);
}