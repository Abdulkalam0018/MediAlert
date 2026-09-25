import { Elixir } from "../models/elixir.model.js";
import { Track } from "../models/track.model.js";
import { User } from "../models/user.model.js";
import dayjs from "dayjs";
import { google } from 'googleapis';

/**
 * Inserts tracks, skipping any that already exist. The unique index on
 * (elixirId, scheduledDate) can be hit when the midnight job and a user's
 * GET /tracks/today create the same day's track at the same moment; before,
 * that threw and either failed the request or skipped the whole elixir.
 */
export const insertTracksIgnoringDuplicates = async (tracks) => {
  if (!tracks.length) return 0;
  try {
    const inserted = await Track.insertMany(tracks, { ordered: false });
    return inserted.length;
  } catch (error) {
    const writeErrors = error?.writeErrors || error?.result?.writeErrors || [];
    const onlyDuplicates =
      error?.code === 11000 ||
      (writeErrors.length > 0 && writeErrors.every((e) => (e.code ?? e.err?.code) === 11000));
    if (!onlyDuplicates) throw error;
    return error?.insertedDocs?.length ?? error?.result?.insertedCount ?? 0;
  }
};

const processElixirsAndGenerateTracks = async (elixirs) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let tracksCreated = 0;

  for (const elixir of elixirs) {
    try {
      // check the latest track entry for this elixir
      const lastTrack = await Track.findOne({ elixirId: elixir._id })
        .sort({ scheduledDate: -1 })
        .lean();
  
      // determine from which date to start generating
      let startDate = new Date(elixir.startDate);
      startDate.setHours(0, 0, 0, 0);
      
      if (lastTrack) {
        const nextDate = new Date(lastTrack.scheduledDate);
        nextDate.setDate(nextDate.getDate() + 1);
        nextDate.setHours(0, 0, 0, 0);
        if (nextDate > today) continue; // already up to date
        startDate = nextDate;
      }
  
      const elixirStartDate = new Date(elixir.startDate);
      elixirStartDate.setHours(0, 0, 0, 0);
      
      // create tracks up to today
      const datesToGenerate = [];
      for (let currentDate = new Date(startDate); currentDate <= today; currentDate.setDate(currentDate.getDate() + 1)) {
        const checkDate = new Date(currentDate);
        checkDate.setHours(0, 0, 0, 0);
        
        // Check if date exceeds end date
        if (checkDate > elixir.endDate) break;
  
        // Calculate days difference from elixir start date
        const daysDiff = Math.floor((checkDate - elixirStartDate) / (1000 * 60 * 60 * 24));
        
        // Frequency-based filtering (same logic as createTracksForDate)
        if (elixir.frequency === "Alternate" && daysDiff % 2 !== 0) continue;
        if (elixir.frequency === "Every3Days" && daysDiff % 3 !== 0) continue;
        if (elixir.frequency === "Weekly") {
          const weeksDiff = Math.floor(daysDiff / 7);
          if (weeksDiff % 1 !== 0 || checkDate.getDay() !== elixirStartDate.getDay()) continue;
        }
        if (elixir.frequency === "Monthly" && checkDate.getDate() !== elixirStartDate.getDate()) continue;
  
        datesToGenerate.push(new Date(checkDate));
      }
  
      const tracks = datesToGenerate.map((scheduledDate) => ({
        userId: elixir.userId,
        elixirId: elixir._id,
        scheduledDate,
        timings: elixir.timings.map(t => {
          const origTime = new Date(t);
          const timingDate = new Date(scheduledDate);
          timingDate.setHours(origTime.getHours(), origTime.getMinutes(), origTime.getSeconds(), 0);
          return {
            time: timingDate,
            status: "pending"
          };
        })
      }));
  
      if (tracks.length) {
        tracksCreated += await insertTracksIgnoringDuplicates(tracks);
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
  // console.log(`🔄 Running daily track generation job at ${new Date().toLocaleString()}`);
  const today = dayjs().startOf("day").toDate();

  try {
    const activeElixirs = await Elixir.find({
      status: "active",
      endDate: { $gte: today },
    });

    const tracksCreated = await processElixirsAndGenerateTracks(activeElixirs);
    
    // console.log(`✅ Daily track generation done at ${new Date().toLocaleString()}. Created ${tracksCreated} tracks.`);
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

    // The user revoked access or the refresh token expired. Retrying every
    // 6 hours will never succeed, so mark the calendar as disconnected and let
    // the UI prompt them to reconnect.
    if (isInvalidGrantError(error)) {
      await User.updateOne(
        { _id: user._id },
        {
          $set: { allowCalendarSync: false },
          $unset: { googleTokens: 1 },
        }
      );
      console.warn(`Google access revoked for user ${user._id}; calendar sync disabled until they reconnect.`);
    }
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

const formatEventTime = (date) =>
  new Date(date).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: process.env.TZ,
  });

/**
 * Deterministic Google Calendar event ID for one dose. Google allows
 * client-chosen IDs (base32hex: 0-9, a-v), and Mongo ObjectIds are hex, so
 * this is valid. Re-inserting the same dose returns 409 instead of creating a
 * duplicate event, which makes sync idempotent even if a run crashes midway.
 */
const eventIdForTiming = (trackId, timingId) => `ma${String(trackId)}${String(timingId)}`;

const isAlreadyExistsError = (error) =>
  error?.code === 409 || error?.status === 409 || error?.response?.status === 409;

const isInvalidGrantError = (error) =>
  error?.response?.data?.error === "invalid_grant" || /invalid_grant/i.test(error?.message || "");

/**
 * Records the event on the timing with this _id. Loading the full track and
 * addressing the timing by _id means the right array element is updated; the
 * old code saved a filtered copy of the array, which wrote event IDs to the
 * wrong index. Mongoose's version key makes the save fail (and the next sync
 * retry) if the timings array was rebuilt in the meantime.
 */
const markTimingSynced = async (trackId, timingId, eventId) => {
  const track = await Track.findById(trackId);
  const timing = track?.timings.id(timingId);
  if (!timing) return; // dose was removed since the sync started
  timing.calendarEventId = eventId;
  timing.lastSyncedAt = new Date();
  await track.save();
};

/**
 * Processes tracks and syncs them to Google Calendar.
 *
 * Tracks come in as lean objects; each synced timing is recorded by its own
 * _id (see markTimingSynced).
 */
const processTracksAndSyncToCalendar = async (tracks, user) => {
  let eventsCreated = 0;
  let eventsFailed = 0;

  const oauth2Client = await getValidOAuth2Client(user);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  for (const track of tracks) {
    const elixir = track.elixirId;
    if (!elixir) continue; // medication was deleted

    for (const timing of track.timings) {
      if (timing.calendarEventId) continue;

      const eventId = eventIdForTiming(track._id, timing._id);

      try {
        const startDateTime = new Date(timing.time);
        // End time is 30 minutes after start (for medication taking)
        const endDateTime = new Date(startDateTime.getTime() + 30 * 60 * 1000);

        const event = {
          id: eventId,
          summary: `💊 Take ${elixir.name}`,
          description: `Medication: ${elixir.name}\n` +
                      `Dosage: ${elixir.dosage || 'Not specified'}\n` +
                      `Frequency: ${elixir.frequency}\n` +
                      `Notes: ${elixir.notes || 'None'}\n\n` +
                      `Scheduled time: ${formatEventTime(startDateTime)}`,
          start: { dateTime: startDateTime.toISOString(), timeZone: process.env.TZ },
          end: { dateTime: endDateTime.toISOString(), timeZone: process.env.TZ },
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'popup', minutes: 15 },
              { method: 'popup', minutes: 5 },
            ],
          },
          colorId: '11', // Red color for medication reminders
        };

        try {
          await calendar.events.insert({ calendarId: 'primary', requestBody: event });
          eventsCreated++;
        } catch (error) {
          // Already created by an earlier (possibly interrupted) run.
          if (!isAlreadyExistsError(error)) throw error;
        }

        await markTimingSynced(track._id, timing._id, eventId);

        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        eventsFailed++;
        console.error(`Error creating calendar event for track ${track._id}, timing ${timing.time}:`, error.message);
      }
    }
  }

  return { eventsCreated, eventsFailed };
};

// One sync per user at a time (cron + "sync now" button + OAuth callback can overlap).
const inFlightUserSyncs = new Map();

/**
 * Syncs calendar for a specific user
 */
const syncCalendarForUser = (userId) => {
  const key = String(userId);
  if (inFlightUserSyncs.has(key)) return inFlightUserSyncs.get(key);

  const run = runSyncCalendarForUser(userId).finally(() => inFlightUserSyncs.delete(key));
  inFlightUserSyncs.set(key, run);
  return run;
};

const runSyncCalendarForUser = async (userId) => {
  const today = dayjs().startOf("day").toDate();

  try {
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

    // Fetch today's and future tracks; unsynced doses are filtered below.
    const tracks = await Track.find({
      userId,
      scheduledDate: { $gte: today },
    })
    .populate('elixirId')
    .lean();

    const tracksToSync = tracks
      .map(track => ({ ...track, timings: track.timings.filter(timing => !timing.calendarEventId) }))
      .filter(track => track.timings.length > 0);

    if (tracksToSync.length === 0) {
      return { eventsCreated: 0, eventsFailed: 0, message: 'All tracks already synced' };
    }

    const result = await processTracksAndSyncToCalendar(tracksToSync, user);

    await User.updateOne({ _id: user._id }, { $set: { lastCalendarSync: new Date() } });

    return {
      ...result,
      message: `Successfully synced ${result.eventsCreated} events`,
    };
  } catch (error) {
    console.error(`Error in syncCalendarForUser for user ${userId}:`, error.message);
    throw error;
  }
};

let allUsersSyncInFlight = null;

/**
 * Syncs calendar for all eligible users. Concurrent callers share one run.
 */
const syncCalendarForAllUsers = () => {
  if (!allUsersSyncInFlight) {
    allUsersSyncInFlight = runSyncCalendarForAllUsers().finally(() => {
      allUsersSyncInFlight = null;
    });
  }
  return allUsersSyncInFlight;
};

const runSyncCalendarForAllUsers = async () => {
  const users = await User.find({
    allowCalendarSync: true,
    'googleTokens.access_token': { $exists: true, $ne: null },
    'googleTokens.refresh_token': { $exists: true, $ne: null },
  }).select('_id');

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
      errors.push({ userId: user._id, error: error.message });
    }
  }

  return { usersProcessed, totalEventsCreated, totalEventsFailed, errors };
};

/**
 * Best-effort removal of calendar events (used when doses are removed or a
 * medication is deleted). Never throws.
 */
const deleteCalendarEventsForUser = async (userId, eventIds = []) => {
  const ids = [...new Set(eventIds.filter(Boolean))];
  if (ids.length === 0) return 0;

  try {
    const user = await User.findById(userId);
    if (!user?.googleTokens?.access_token || !user?.googleTokens?.refresh_token) return 0;

    let deleted = 0;
    for (const eventId of ids) {
      if (await deleteCalendarEvent(eventId, user)) deleted++;
    }
    return deleted;
  } catch (error) {
    console.error(`Error deleting calendar events for user ${userId}:`, error.message);
    return 0;
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
    const status = error?.code || error?.response?.status;
    if (status === 404 || status === 410) return true; // already gone
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
    deleteCalendarEventsForUser,
    updateCalendarEvent,
    refreshGoogleToken,
    createOAuth2Client
};