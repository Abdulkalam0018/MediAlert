import { google } from 'googleapis';
import {User} from '../models/user.model.js'; 
import { Track } from '../models/track.model.js';
import { getAuth } from '@clerk/express';
import { syncCalendarForUser } from '../utils/sync.js';
import { getUserId } from '../utils/clerk.js';
import { createOAuthState, verifyOAuthState } from '../utils/oauthState.js';
import { isAllowedOrigin, getDefaultFrontendUrl } from '../config/origins.js';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

const scope = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events'
];

const resolveRedirectOrigin = (candidate) => {
    if (!candidate) return getDefaultFrontendUrl();
    try {
        const { origin } = new URL(candidate);
        return isAllowedOrigin(origin) ? origin : getDefaultFrontendUrl();
    } catch {
        return getDefaultFrontendUrl();
    }
};

/**
 * POST /google/auth/url  (requires Clerk auth)
 * Returns a Google consent URL whose `state` is signed and bound to the
 * signed-in user. The user ID comes from the session, never from the URL.
 */
const getGoogleAuthUrl = (req, res) => {
    const clerkId = getAuth(req)?.userId;
    if (!clerkId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const redirectOrigin = resolveRedirectOrigin(req.body?.redirect || req.get('origin'));

    const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline', // important to get refresh token
        prompt: 'consent',
        scope: scope,
        state: createOAuthState({ clerkId, redirectOrigin }),
    });

    return res.status(200).json({ url: authUrl });
};

const handleGoogleCallback = async (req, res) => {
    const code = req.query.code;
    const verified = verifyOAuthState(req.query.state);

    // Only trust a redirect target that came from a valid signed state *and*
    // is still on the allow-list; otherwise use the default frontend URL.
    const cleanOrigin = resolveRedirectOrigin(verified?.redirectOrigin);

    if (!verified) {
        return res.redirect(`${cleanOrigin}/dashboard?calendar=invalid_state`);
    }

    if (!code) {
        return res.redirect(`${cleanOrigin}/dashboard?calendar=no_code`);
    }

    try {
        const { tokens } = await oauth2Client.getToken(code);

        const user = await User.findOne({ clerkId: verified.clerkId });
        if (!user) {
            console.error('User not found in DB for clerkId:', verified.clerkId);
            return res.redirect(`${cleanOrigin}/dashboard?calendar=user_not_found`);
        }

        user.googleTokens = {
            access_token: tokens.access_token,
            // Google only returns a refresh token on some consents; keep the old one if absent.
            refresh_token: tokens.refresh_token || user.googleTokens?.refresh_token,
            expires_date: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
            last_refresh_at: new Date(),
        };
        user.allowCalendarSync = true; // Enable calendar sync when user connects
        await user.save();

        // Trigger initial calendar sync in background
        syncCalendarForUser(user._id).catch(err => {
            console.error('Error during initial calendar sync:', err);
        });

        res.redirect(`${cleanOrigin}/dashboard?calendar=connected`);
    } catch (err) {
        console.error('Failed to exchange code for tokens:', err);
        res.redirect(`${cleanOrigin}/dashboard?calendar=error`);
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

        // Forget which doses were synced, so reconnecting (possibly with a
        // different Google account) re-creates the events. Event IDs are
        // deterministic, so reconnecting the same account won't duplicate them.
        // Only today's and future doses are ever synced, so only those need resetting.
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const syncedTracks = await Track.find({
            userId: user._id,
            scheduledDate: { $gte: startOfToday },
            "timings.calendarEventId": { $exists: true, $ne: null },
        });
        for (const track of syncedTracks) {
            track.timings.forEach((timing) => {
                timing.calendarEventId = undefined;
                timing.lastSyncedAt = undefined;
            });
            await track.save();
        }

        return res.status(200).json({
            message: 'Google Calendar disconnected successfully',
            isConnected: false,
            allowCalendarSync: false,
            lastCalendarSync: null,
        });
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
    getGoogleAuthUrl,
    handleGoogleCallback,
    syncCalendar,
    disconnectCalendar,
    toggleCalendarSync,
    getCalendarStatus,
};
