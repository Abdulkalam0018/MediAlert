import { google } from 'googleapis';
import {User} from '../models/user.model.js'; 

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

const scope = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events'
];


const redirectToGoogle = (req, res) => {
    const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline', // important to get refresh token
        prompt: 'consent',
        scope: scope
    });
    res.redirect(authUrl);
};

const handleGoogleCallback = async (req, res) => {
    console.log("Its working till google conroller handle callback", req.query);
    
    const code = req.query.code;
    if (!code) return res.status(400).json({ error: 'No code provided' });

    try {
        const { tokens } = await oauth2Client.getToken(code);
        // tokens contain: access_token, refresh_token, expiry_date

        // TODO: save tokens in your DB under the Clerk user ID

        res.json({ message: 'Tokens received', tokens });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to exchange code for tokens' });
    }
};

export {
    redirectToGoogle,
    handleGoogleCallback
};