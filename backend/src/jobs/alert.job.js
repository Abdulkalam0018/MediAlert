import cron from "node-cron";
import { generateProactiveAlerts } from "../utils/alert.js";

cron.schedule("*/15 * * * *", async () => {
  console.log("Running proactive alert generator...");
  await generateProactiveAlerts();
});