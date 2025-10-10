import { google } from 'googleapis';
import {User} from '../models/user.model.js'; 
import { getAuth } from '@clerk/express';
import { syncCalendarForUser } from '../utils/sync.js';
import { getUserId } from '../utils/clerk.js';

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

        const updatedUser = await User.findOneAndUpdate({ clerkId: getAuth(req).userId }, 
        {
            googleTokens: {
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
                expires_date: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
                last_refresh_at: new Date(),
            },
            allowCalendarSync: true, // Enable calendar sync when user connects
        },
        { new: true }
        );
        
        if (!updatedUser) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Trigger initial calendar sync in background
        syncCalendarForUser(updatedUser._id).catch(err => {
            console.error('Error during initial calendar sync:', err);
        });

        // return res.status(200).json({ message: 'Google Calendar connected successfully' });
        res.redirect(`${process.env.FRONTEND_URL}/calendar-sync?calendar=connected`);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to exchange code for tokens' });
    }
};

const createCalendarEvent = async (event) => {
    try {
        const response = await calendar.events.insert({
            calendarId: 'primary',
            requestBody: event
        });
        return response.data;
    } catch (error) {
        console.error('Error creating calendar event:', error);
        throw error;
    }
};

const syncCalendar = async (req, res) => {
    try {
        const userId = await getUserId(req);
        
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized: No user ID found' });
        }

        const result = await syncCalendarForUser(userId);
        
        return res.status(200).json({
            message: result.message,
            eventsCreated: result.eventsCreated,
            eventsFailed: result.eventsFailed
        });
    } catch (error) {
        console.error('Error in syncCalendar:', error);
        return res.status(500).json({ error: 'Failed to sync calendar', details: error.message });
    }
};

const disconnectCalendar = async (req, res) => {
    try {
        const userId = await getUserId(req);
        
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized: No user ID found' });
        }

        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Clear Google tokens and sync settings
        user.googleTokens = {
            access_token: null,
            refresh_token: null,
            expires_date: null,
            last_refresh_at: null,
        };
        user.allowCalendarSync = false;
        user.lastCalendarSync = null;
        
        await user.save();

        return res.status(200).json({ message: 'Google Calendar disconnected successfully' });
    } catch (error) {
        console.error('Error in disconnectCalendar:', error);
        return res.status(500).json({ error: 'Failed to disconnect calendar', details: error.message });
    }
};

const toggleCalendarSync = async (req, res) => {
    try {
        const userId = await getUserId(req);
        const { enabled } = req.body;
        
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized: No user ID found' });
        }

        if (typeof enabled !== 'boolean') {
            return res.status(400).json({ error: 'enabled field must be a boolean' });
        }

        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (enabled && (!user.googleTokens?.access_token || !user.googleTokens?.refresh_token)) {
            return res.status(400).json({ error: 'Google Calendar not connected. Please connect first.' });
        }

        user.allowCalendarSync = enabled;
        await user.save();

        // If enabling, trigger sync
        if (enabled) {
            syncCalendarForUser(userId).catch(err => {
                console.error('Error during calendar sync after toggle:', err);
            });
        }

        return res.status(200).json({ 
            message: `Calendar sync ${enabled ? 'enabled' : 'disabled'} successfully`,
            allowCalendarSync: user.allowCalendarSync
        });
    } catch (error) {
        console.error('Error in toggleCalendarSync:', error);
        return res.status(500).json({ error: 'Failed to toggle calendar sync', details: error.message });
    }
};

const getCalendarStatus = async (req, res) => {
    try {
        const userId = await getUserId(req);
        
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized: No user ID found' });
        }

        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const isConnected = !!(user.googleTokens?.access_token && user.googleTokens?.refresh_token);

        return res.status(200).json({
            isConnected,
            allowCalendarSync: user.allowCalendarSync,
            lastCalendarSync: user.lastCalendarSync,
            tokenExpiry: user.googleTokens?.expires_date || null
        });
    } catch (error) {
        console.error('Error in getCalendarStatus:', error);
        return res.status(500).json({ error: 'Failed to get calendar status', details: error.message });
    }
};

export {
    redirectToGoogle,
    handleGoogleCallback,
    createCalendarEvent,
    syncCalendar,
    disconnectCalendar,
    toggleCalendarSync,
    getCalendarStatus,
};