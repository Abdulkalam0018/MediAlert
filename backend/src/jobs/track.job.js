import cron from "node-cron";
import { generateDailyTracks, syncCalendarForAllUsers } from "../utils/sync.js";

const runDailyTrackJob = async (source = "manual") => {
  console.log(`[${new Date().toISOString()}] Running generateDailyTracks (triggered by: ${source})`);
  try {
    await generateDailyTracks();
    console.log(`[${new Date().toISOString()}] Daily track generation completed successfully.`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error during daily track generation:`, error);
  }
    
  // After generating tracks, sync to calendar for all users
  console.log(`[${new Date().toISOString()}] Starting calendar sync after track generation...`);
  try {
    await syncCalendarForAllUsers();
    console.log(`[${new Date().toISOString()}] Calendar sync completed after track generation.`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error in calendar sync job:`, error);
  }
};

// 1. Run once immediately when the server starts/restarts
runDailyTrackJob("server_start");

// Schedule daily track generation at midnight (00:00)
cron.schedule("0 0 * * *", async () => {
  runDailyTrackJob("scheduled_cron_job");
});
