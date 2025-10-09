import cron from "node-cron";
import { generateDailyTracks } from "../utils/sync.js";

// Schedule daily track generation at midnight (00:00)
cron.schedule("0 0 * * *", async () => {
  try {
    await generateDailyTracks();
  } catch (error) {
    console.error("Error in daily track generation job:", error);
  }
});
