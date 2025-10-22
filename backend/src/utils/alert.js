import { Track } from "../models/track.model.js";
import { ProactiveAlert } from "../models/proactiveAlert.model.js";
import { sendNotification } from "../firebase/firebase.service.js";

/**
 * Simple heuristic baseline (replace later with trained ML model)
 */
export const generateProactiveAlerts = async () => {
  try {
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Start of today
    
    const next24Hours = new Date(now);
    next24Hours.setDate(next24Hours.getDate() + 1); // End of today (start of tomorrow)
      
    const tracks = await Track.find({
      scheduledDate: { $gte: now, $lt: next24Hours },
      timings: {
        $elemMatch: { status: "pending" }
      }
    }).populate("userId").populate("elixirId");
      
    for (const track of tracks) {
      const user = track.userId;
      const elixir = track.elixirId;
  
      // simple rule: evening doses or frequent misses → higher probability
      const missedCount = await Track.countDocuments({
        userId: user._id,
        "timings.status": "missed",
        scheduledDate: { $gte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) }, // last 3 days
      });
      const totalCount = await Track.countDocuments({ userId: user._id });
  
      const missRate = totalCount > 0 ? missedCount / totalCount : 0;
  
      // baseline prediction
      let probability = 0.3 + missRate; // start with user’s miss rate
      if (track.timings.some(t => t.getHours() >= 18)) {
        probability += 0.1; // evening doses harder to remember
      }
  
      // Limit to 1.0
      probability = Math.min(1, probability);      
  
      // Save only if above threshold
      if (probability >= 0.5) {
        await ProactiveAlert.create({
          userId: user._id,
          elixirId: elixir._id,
          trackId: track._id,
          scheduledDate: track.scheduledDate,
          timing: track.timings[0].time,
          probabilityMissed: probability,
          threshold: 0.5,
          alertStatus: "triggered",
          sentAt: new Date(),
          channel: "push",
        });
  
        // Here call your notification sender (push/email/SMS)
        if (user.fcmToken) {
          const title = "Medication Reminder";
          const body = `You have a high chance of missing your ${elixir.name} dose at ${track.timings[0].time}. Please remember to take it.`;
          await sendNotification(user.fcmToken, title, body, {
            trackId: track._id.toString(),
            elixirId: elixir._id.toString(),
          });
        }
        // console.log(`Proactive alert sent to ${user.name} for ${elixir.name}`);
      }
    }
  } catch (error) {
    console.error("Error generating proactive alerts:", error);
  }
};