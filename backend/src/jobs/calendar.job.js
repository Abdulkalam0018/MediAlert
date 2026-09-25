import cron from "node-cron";
import { syncCalendarForAllUsers } from "../utils/sync.js";
import { APP_TIMEZONE } from "../config/timezone.js";

const runCalendarSyncJob = async (source = "manual") => {
  console.log(`[${new Date().toISOString()}] Running syncCalendarForAllUsers (triggered by: ${source})`);
  try {
    const result = await syncCalendarForAllUsers();
    console.log(`[${new Date().toISOString()}] Calendar sync completed: ${result.totalEventsCreated} events created, ${result.totalEventsFailed} failed, ${result.usersProcessed} users.`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error in calendar sync job:`, error);
  }
};

// No run on startup and no 00:00 slot: track.job already syncs right after it
// generates the day's tracks (on startup and at midnight). Running both at the
// same time used to race and create duplicate calendar events.
cron.schedule("0 6,12,18 * * *", () => runCalendarSyncJob("scheduled_cron_job"), {
  timezone: APP_TIMEZONE,
  noOverlap: true,
});

export { runCalendarSyncJob };
