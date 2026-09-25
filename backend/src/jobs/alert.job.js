import cron from "node-cron";
import { generateProactiveAlerts } from "../utils/alert.js";
import { APP_TIMEZONE } from "../config/timezone.js";

const runProactiveAlertJob = async (source = "manual") => {
  console.log(`[${new Date().toISOString()}] Running proactive alert generator (triggered by: ${source})`);
  try {
    const result = await generateProactiveAlerts();
    console.log(`[${new Date().toISOString()}] Proactive alerts done: ${result.alertsSent} sent, ${result.tracksChecked} tracks checked.`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error in proactive alert job:`, error);
  }
};

// Safe to run on start: each dose is only ever alerted once.
runProactiveAlertJob("server_start");

// Every 15 minutes. Returning the promise lets noOverlap skip a tick if the
// previous run is still going.
cron.schedule("*/15 * * * *", () => runProactiveAlertJob("scheduled_cron_job"), {
  timezone: APP_TIMEZONE,
  noOverlap: true,
});

export { runProactiveAlertJob };
