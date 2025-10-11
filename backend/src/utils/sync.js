import { Elixir } from "../models/elixir.model.js";
import { Track } from "../models/track.model.js";
import { User } from "../models/user.model.js";
import dayjs from "dayjs";
import { google } from 'googleapis';

const processElixirsAndGenerateTracks = async (elixirs) => {
  const today = dayjs().startOf("day").toDate();
  let tracksCreated = 0;

  for (const elixir of elixirs) {
    try {
      // check the latest track entry for this elixir
      const lastTrack = await Track.findOne({ elixirId: elixir._id })
        .sort({ scheduledDate: -1 })
        .lean();
  
      // determine from which date to start generating
      let startDate = elixir.startDate;
      if (lastTrack) {
        const nextDate = dayjs(lastTrack.scheduledDate).add(1, "day").toDate();
        if (nextDate > today) continue; // already up to date
        startDate = nextDate;
      }
  
      // create tracks up to today
      const datesToGenerate = [];
      for (let d = dayjs(startDate); d.isBefore(dayjs(today)) || d.isSame(today); d = d.add(1, "day")) {
        if (d.toDate() > elixir.endDate) break;
  
        if (elixir.frequency === "Alternate" && d.diff(dayjs(elixir.startDate), "day") % 2 !== 0) continue;
        if (elixir.frequency === "Every3Days" && d.diff(dayjs(elixir.startDate), "day") % 3 !== 0) continue;
        if (elixir.frequency === "Weekly" && d.diff(dayjs(elixir.startDate), "week") % 1 !== 0) continue;
        if (elixir.frequency === "Monthly" && d.date() !== dayjs(elixir.startDate).date()) continue;
  
        datesToGenerate.push(d.toDate());
      }
  
      const tracks = datesToGenerate.map((scheduledDate) => ({
        userId: elixir.userId,
        elixirId: elixir._id,
        scheduledDate,
        timings: elixir.timings.map(time => ({ time }))
      }));
  
      if (tracks.length) {
        await Track.insertMany(tracks);
        tracksCreated += tracks.length;
      }
    
    } catch (error) {
      console.error(`Error generating tracks for elixir ${elixir._id}:`, error);
      continue;
    }
  }

  return tracksCreated;
};

/**
 * Generates daily tracks for all active elixirs
 * This function handles the complete logic for creating track entries
 * based on elixir schedules and frequencies
 */
const generateDailyTracks = async () => {
  console.log(`🔄 Running daily track generation job at ${new Date().toLocaleString()}`);
  const today = dayjs().startOf("day").toDate();

  try {
    const activeElixirs = await Elixir.find({
      status: "active",
      endDate: { $gte: today },
    });

    const tracksCreated = await processElixirsAndGenerateTracks(activeElixirs);
    
    console.log(`✅ Daily track generation done at ${new Date().toLocaleString()}. Created ${tracksCreated} tracks.`);
  } catch (error) {
    console.error("Error in generateDailyTracks:", error);
    throw error;
  }
};

const generateDailyTracksOfUser = async (userId) => {
  const today = dayjs().startOf("day").toDate();

  try {
    const activeElixirs = await Elixir.find({
      userId,
      status: "active",
      endDate: { $gte: today },
    });

    const tracksCreated = await processElixirsAndGenerateTracks(activeElixirs);
    
  } catch (error) {
    console.error("Error in generateDailyTracksOfUser:", error);
    throw error;
  }
};

/**
 * Creates an OAuth2 client with user's tokens
 */
const createOAuth2Client = (user) => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  oauth2Client.setCredentials({
    access_token: user.googleTokens.access_token,
    refresh_token: user.googleTokens.refresh_token,
    expiry_date: user.googleTokens.expires_date ? new Date(user.googleTokens.expires_date).getTime() : null,
  });

  return oauth2Client;
};

/**
 * Refreshes Google access token using refresh token
 */
const refreshGoogleToken = async (user) => {
  try {
    const oauth2Client = createOAuth2Client(user);
    const { credentials } = await oauth2Client.refreshAccessToken();

    // Update user with new tokens
    user.googleTokens.access_token = credentials.access_token;
    user.googleTokens.expires_date = credentials.expiry_date ? new Date(credentials.expiry_date) : null;
    user.googleTokens.last_refresh_at = new Date();
    
    await user.save();

    return oauth2Client;
  } catch (error) {
    console.error(`Error refreshing token for user ${user._id}:`, error.message);
    throw error;
  }
};

/**
 * Gets a valid OAuth2 client, refreshing token if needed
 */
const getValidOAuth2Client = async (user) => {
  const now = new Date();
  const expiresDate = user.googleTokens.expires_date;

  // Check if token is expired or about to expire (within 5 minutes)
  if (expiresDate && new Date(expiresDate).getTime() - now.getTime() < 5 * 60 * 1000) {
    return await refreshGoogleToken(user);
  }

  return createOAuth2Client(user);
};

/**
 * Processes tracks and syncs them to Google Calendar
 */
const processTracksAndSyncToCalendar = async (tracks, user) => {
  let eventsCreated = 0;
  let eventsFailed = 0;

  try {
    const oauth2Client = await getValidOAuth2Client(user);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    for (const track of tracks) {
      const elixir = track.elixirId;
      
      for (const timing of track.timings) {
        // Skip if already synced
        if (timing.calendarEventId) {
          continue;
        }

        try {
          // Parse time (e.g., "09:00" or "14:30")
          const [hours, minutes] = timing.time.split(':').map(Number);
          
          // Create start time by combining scheduled date with timing
          const startDateTime = dayjs(track.scheduledDate)
            .hour(hours)
            .minute(minutes)
            .second(0)
            .millisecond(0);
          
          // End time is 30 minutes after start (for medication taking)
          const endDateTime = startDateTime.add(30, 'minute');

          // Create calendar event
          const event = {
            summary: `💊 Take ${elixir.name}`,
            description: `Medication: ${elixir.name}\n` +
                        `Dosage: ${elixir.dosage || 'Not specified'}\n` +
                        `Frequency: ${elixir.frequency}\n` +
                        `Notes: ${elixir.notes || 'None'}\n\n` +
                        `Scheduled time: ${timing.time}`,
            start: {
              dateTime: startDateTime.toISOString(),
              timeZone: 'UTC',
            },
            end: {
              dateTime: endDateTime.toISOString(),
              timeZone: 'UTC',
            },
            reminders: {
              useDefault: false,
              overrides: [
                { method: 'popup', minutes: 15 },
                { method: 'popup', minutes: 5 },
              ],
            },
            colorId: '11', // Red color for medication reminders
          };

          const response = await calendar.events.insert({
            calendarId: 'primary',
            requestBody: event,
          });

          // Update timing with calendar event ID
          timing.calendarEventId = response.data.id;
          timing.lastSyncedAt = new Date();
          
          await track.save();
          eventsCreated++;

          
          // Add small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          eventsFailed++;
          console.error(`Error creating calendar event for track ${track._id}, timing ${timing.time}:`, error.message);
          continue;
        }
      }
    }

    return { eventsCreated, eventsFailed };
  } catch (error) {
    console.error(`Error in processTracksAndSyncToCalendar for user ${user._id}:`, error.message);
    throw error;
  }
};

/**
 * Syncs calendar for a specific user
 */
const syncCalendarForUser = async (userId) => {

  const today = dayjs().startOf("day").toDate();

  try {
    // Find user and validate
    const user = await User.findById(userId);
    
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    if (!user.allowCalendarSync) {
      return { eventsCreated: 0, eventsFailed: 0, message: 'Calendar sync is disabled' };
    }

    if (!user.googleTokens?.access_token || !user.googleTokens?.refresh_token) {
      return { eventsCreated: 0, eventsFailed: 0, message: 'Google Calendar not connected' };
    }

    // Fetch active tracks that need syncing (today and future)
    const tracks = await Track.find({
      userId,
      scheduledDate: { $gte: today },
    })
    .populate('elixirId')
    .lean();

    if (tracks.length === 0) {
      return { eventsCreated: 0, eventsFailed: 0, message: 'No tracks to sync' };
    }

    // Filter tracks with timings that don't have calendar events
    const tracksToSync = tracks.filter(track => 
      track.timings.some(timing => !timing.calendarEventId)
    ).map(track => ({
      ...track,
      timings: track.timings.filter(timing => !timing.calendarEventId)
    }));

    if (tracksToSync.length === 0) {
      return { eventsCreated: 0, eventsFailed: 0, message: 'All tracks already synced' };
    }

    // Convert lean documents back to Mongoose documents for save()
    const tracksWithModels = tracksToSync.map(trackData => Track.hydrate(trackData));

    const result = await processTracksAndSyncToCalendar(tracksWithModels, user);

    // Update last sync timestamp
    user.lastCalendarSync = new Date();
    await user.save();

    
    return {
      ...result,
      message: `Successfully synced ${result.eventsCreated} events`,
    };
  } catch (error) {
    console.error(`Error in syncCalendarForUser for user ${userId}:`, error);
    throw error;
  }
};

/**
 * Syncs calendar for all eligible users
 */
const syncCalendarForAllUsers = async () => {
  console.log(`🔄 Running calendar sync for all users at ${new Date().toLocaleString()}`);
  
  try {
    // Find all users with calendar sync enabled and Google tokens
    const users = await User.find({
      allowCalendarSync: true,
      'googleTokens.access_token': { $exists: true, $ne: null },
      'googleTokens.refresh_token': { $exists: true, $ne: null },
    });

    if (users.length === 0) {
      return { usersProcessed: 0, totalEventsCreated: 0, totalEventsFailed: 0, errors: [] };
    }


    let usersProcessed = 0;
    let totalEventsCreated = 0;
    let totalEventsFailed = 0;
    const errors = [];

    for (const user of users) {
      try {
        const result = await syncCalendarForUser(user._id);
        usersProcessed++;
        totalEventsCreated += result.eventsCreated;
        totalEventsFailed += result.eventsFailed;
        
        // Add delay between users to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        errors.push({
          userId: user._id,
          error: error.message,
        });
        console.error(`Failed to sync calendar for user ${user._id}:`, error.message);
        continue;
      }
    }

    console.log(`✅ Calendar sync completed for all users. Users: ${usersProcessed}, Events created: ${totalEventsCreated}, Failed: ${totalEventsFailed}`);
    
    return {
      usersProcessed,
      totalEventsCreated,
      totalEventsFailed,
      errors,
    };
  } catch (error) {
    console.error('Error in syncCalendarForAllUsers:', error);
    throw error;
  }
};

/**
 * Deletes a calendar event from Google Calendar
 */
const deleteCalendarEvent = async (eventId, user) => {
  try {
    const oauth2Client = await getValidOAuth2Client(user);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    await calendar.events.delete({
      calendarId: 'primary',
      eventId: eventId,
    });

    return true;
  } catch (error) {
    console.error(`Error deleting calendar event ${eventId}:`, error.message);
    return false;
  }
};

/**
 * Updates a calendar event in Google Calendar
 */
const updateCalendarEvent = async (eventId, eventData, user) => {
  try {
    const oauth2Client = await getValidOAuth2Client(user);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const response = await calendar.events.update({
      calendarId: 'primary',
      eventId: eventId,
      requestBody: eventData,
    });

    return response.data;
  } catch (error) {
    console.error(`Error updating calendar event ${eventId}:`, error.message);
    throw error;
  }
};

export { 
    generateDailyTracks,
    generateDailyTracksOfUser,
    syncCalendarForUser,
    syncCalendarForAllUsers,
    deleteCalendarEvent,
    updateCalendarEvent,
    refreshGoogleToken,
    createOAuth2Client
};