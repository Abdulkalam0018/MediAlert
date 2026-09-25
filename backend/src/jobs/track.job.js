import cron from "node-cron";
import { generateDailyTracks, syncCalendarForAllUsers } from "../utils/sync.js";
import { APP_TIMEZONE } from "../config/timezone.js";

const runDailyTrackJob = async (source = "manual") => {
  console.log(`[${new Date().toISOString()}] Running generateDailyTracks (triggered by: ${source})`);
  try {
    await generateDailyTracks();
    console.log(`[${new Date().toISOString()}] Daily track generation completed successfully.`);
    
    // After generating tracks, sync to calendar for all users
    console.log(`[${new Date().toISOString()}] Starting calendar sync after track generation...`);
    await syncCalendarForAllUsers();
    console.log(`[${new Date().toISOString()}] Calendar sync completed after track generation.`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error in daily track generation job:`, error);
  }
};

// 1. Run once immediately when the server starts/restarts
runDailyTrackJob("server_start");

// 2. Midnight in the app timezone (not the host's UTC midnight, which is 05:30 IST)
cron.schedule("0 0 * * *", () => runDailyTrackJob("scheduled_cron_job"), {
  timezone: APP_TIMEZONE,
  noOverlap: true,
});

export { runDailyTrackJob };
