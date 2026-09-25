import { Track } from "../models/track.model.js";
import { ProactiveAlert } from "../models/proactiveAlert.model.js";
import { User } from "../models/user.model.js";
import { deliverNotification, isInvalidTokenError } from "../firebase/firebase.service.js";
import { publishEvent } from "../config/rabbitmq.js";
import { APP_TIMEZONE } from "../config/timezone.js";

/**
 * Proactive "you might miss this dose" nudges.
 *
 * Fixes compared to the previous version:
 *  - Each dose gets at most ONE nudge. Before, every pending dose of the day
 *    was re-alerted every 15 minutes (and again on every server restart).
 *  - Only doses due soon are considered, instead of the whole day.
 *  - The nudge names the specific dose and formats its time for the user,
 *    instead of always using timings[0] and printing a raw Date string.
 *  - Miss rate uses the same 7-day window for numerator and denominator.
 *    Before it divided 3 days of misses by all-time tracks, so the score
 *    decayed toward zero the longer someone used the app.
 *  - Deleted medications no longer crash the whole run.
 *  - Respects the medication's remindersEnabled flag.
 *  - One history query per user per run instead of two per track.
 */

const THRESHOLD = 0.5;
const LOOKAHEAD_MINUTES = 30; // nudge doses due within the next 30 min...
const GRACE_MINUTES = 30;     // ...or that became due in the last 30 min
const HISTORY_DAYS = 7;
const EVENING_HOUR = 18;
const MINUTE = 60 * 1000;

const formatDoseTime = (date) =>
  new Date(date).toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: APP_TIMEZONE,
  });

const localHour = (date) =>
  Number(
    new Date(date).toLocaleString("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone: APP_TIMEZONE,
    })
  ) % 24;

/**
 * Share of this user's doses over the last HISTORY_DAYS (excluding today) that
 * were missed. A dose left "pending" after its day ended was never logged,
 * so it counts as missed too.
 */
const getMissRate = async (userId, todayStart) => {
  const since = new Date(todayStart.getTime() - HISTORY_DAYS * 24 * 60 * MINUTE);

  // At most HISTORY_DAYS of doses per user, so counting in JS is cheap and
  // avoids aggregation operators some Mongo-compatible servers lack.
  const history = await Track.find({ userId, scheduledDate: { $gte: since, $lt: todayStart } })
    .select("timings.status")
    .lean();

  let total = 0;
  let missed = 0;
  for (const track of history) {
    for (const timing of track.timings) {
      total++;
      if (timing.status === "missed" || timing.status === "pending") missed++;
    }
  }

  return total === 0 ? 0 : missed / total;
};

const sendPush = async ({ user, title, body, data }) => {
  if (!user.fcmToken) return;

  const published = publishEvent("notifications", {
    fcmToken: user.fcmToken,
    title,
    body,
    data,
    userId: String(user._id),
  });
  if (published) return;

  // Fallback if RabbitMQ is not connected
  try {
    await deliverNotification(user.fcmToken, title, body, data);
  } catch (error) {
    if (isInvalidTokenError(error)) {
      await User.updateOne({ _id: user._id, fcmToken: user.fcmToken }, { $unset: { fcmToken: 1 } });
      return;
    }
    console.error(`Push failed for user ${user._id}:`, error?.code || error?.message);
  }
};

export const generateProactiveAlerts = async () => {
  const now = new Date();
  const windowStart = new Date(now.getTime() - GRACE_MINUTES * MINUTE);
  const windowEnd = new Date(now.getTime() + LOOKAHEAD_MINUTES * MINUTE);

  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  // Broad match (some dose pending, some dose in the window); the exact
  // pending-and-due doses are picked out per track below.
  const tracks = await Track.find({
    "timings.status": "pending",
    "timings.time": { $gte: windowStart, $lte: windowEnd },
  })
    .populate("userId", "fcmToken")
    .populate("elixirId", "name status remindersEnabled");

  const missRateByUser = new Map();
  let sent = 0;

  for (const track of tracks) {
    const user = track.userId;
    const elixir = track.elixirId;

    // Medication or user was deleted after this track was generated.
    if (!user || !elixir) continue;
    if (elixir.status && elixir.status !== "active") continue;
    if (elixir.remindersEnabled === false) continue;

    const userKey = String(user._id);
    if (!missRateByUser.has(userKey)) {
      missRateByUser.set(userKey, await getMissRate(user._id, todayStart));
    }
    const missRate = missRateByUser.get(userKey);

    const dueTimings = track.timings.filter(
      (t) => t.status === "pending" && t.time >= windowStart && t.time <= windowEnd
    );

    for (const timing of dueTimings) {
      try {
        let probability = 0.3 + missRate;
        if (localHour(timing.time) >= EVENING_HOUR) {
          probability += 0.1; // evening doses are harder to remember
        }
        probability = Math.min(1, probability);

        if (probability < THRESHOLD) continue;

        // One nudge per dose. The explicit check works even if the unique
        // index couldn't be built because of old duplicate rows.
        const alreadyAlerted = await ProactiveAlert.exists({ trackId: track._id, timing: timing.time });
        if (alreadyAlerted) continue;

        try {
          await ProactiveAlert.create({
            userId: user._id,
            elixirId: elixir._id,
            trackId: track._id,
            scheduledDate: track.scheduledDate,
            timing: timing.time,
            probabilityMissed: probability,
            threshold: THRESHOLD,
            alertStatus: "triggered",
            sentAt: new Date(),
            channel: "push",
          });
        } catch (error) {
          if (error?.code === 11000) continue; // another run got here first
          throw error;
        }

        await sendPush({
          user,
          title: "Medication reminder",
          body: `Your ${elixir.name} dose is due at ${formatDoseTime(timing.time)}. Log it in MediAlert once you've taken it.`,
          data: {
            trackId: track._id.toString(),
            elixirId: elixir._id.toString(),
            time: timing.time.toISOString(),
          },
        });
        sent++;
      } catch (error) {
        // One bad dose shouldn't stop alerts for everyone else.
        console.error(`Proactive alert failed for track ${track._id}:`, error);
      }
    }
  }

  return { tracksChecked: tracks.length, alertsSent: sent };
};
