import cron from "node-cron";
import { generateProactiveAlerts } from "../utils/alert.js";

const runProactiveAlertJob = async (source = "manual") => {
  console.log(`[${new Date().toISOString()}] Running proactive alert generator (triggered by: ${source})`);
  try {
    await generateProactiveAlerts();
    console.log(`[${new Date().toISOString()}] Proactive alert generation completed successfully.`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error in proactive alert job:`, error);
  }
};

// Run once immediately when the server starts/restarts
runProactiveAlertJob("server_start");

// Schedule proactive alert generation every 15 minutes
cron.schedule("*/15 * * * *", async () => {
  runProactiveAlertJob("scheduled_cron_job");
});