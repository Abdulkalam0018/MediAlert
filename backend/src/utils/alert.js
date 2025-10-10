import { Track } from "../models/track.model.js";
import { ProactiveAlert } from "../models/proactiveAlert.model.js";
import { Elixir } from "../models/elixir.model.js";
import { User } from "../models/user.model.js";

/**
 * Simple heuristic baseline (replace later with trained ML model)
 */
export const generateProactiveAlerts = async () => {
  const now = new Date();
  const next2Hours = new Date(now.getTime() + 2 * 60 * 60 * 1000);

  // Find all track events scheduled within next 2 hours
  const tracks = await Track.find({
    "timings.status": "pending",
    scheduledDate: { $gte: now, $lte: next2Hours },
  })
    .populate("userId")
    .populate("elixirId");

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
    if (track.timings.some(t => parseInt(t.time.split(":")[0]) >= 18)) {
      probability += 0.1; // evening doses harder to remember
    }

    // Limit to 1.0
    probability = Math.min(1, probability);

    // Save only if above threshold
    if (probability >= 0.6) {
      await ProactiveAlert.create({
        userId: user._id,
        elixirId: elixir._id,
        trackId: track._id,
        scheduledDate: track.scheduledDate,
        timing: track.timings[0].time,
        probabilityMissed: probability,
        threshold: 0.6,
        alertStatus: "triggered",
        sentAt: new Date(),
        channel: "push",
      });

      // Here call your notification sender (push/email/SMS)
      // console.log(`Proactive alert sent to ${user.email} for ${elixir.name}`);
    }
  }
};