import cron from "node-cron";
import { syncCalendarForAllUsers } from "../utils/sync.js";

const runCalendarSyncJob = async (source = "manual") => {
  console.log(`[${new Date().toISOString()}] Running syncCalendarForAllUsers (triggered by: ${source})`);
  try {
    const result = await syncCalendarForAllUsers();
    console.log(`[${new Date().toISOString()}] Calendar sync completed:`, result);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error in calendar sync job:`, error);
  }
};

// Run once immediately when the server starts/restarts
runCalendarSyncJob("server_start");

// Schedule calendar sync every 6 hours
// Runs at 00:00, 06:00, 12:00, and 18:00
cron.schedule("0 */6 * * *", async () => {
  runCalendarSyncJob("scheduled_cron_job");
});

export { runCalendarSyncJob };
