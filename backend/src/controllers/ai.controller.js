import mongoose from "mongoose";
import { Elixir } from "../models/elixir.model.js";
import { Track } from "../models/track.model.js";
import { getUserId } from "../utils/clerk.js";
import { createTracksForDate } from "./track.controller.js";
import {
  buildActionNeedsMedicationMessage,
  buildActionNeedsStatusMessage,
  buildActionNoMatchMessage,
  buildActionSuccessMessage,
  extractMedicationActionIntent,
  getAIResponse,
  getTimingDistance,
  isTimingWithinMatchWindow,
} from "../services/ai.service.js";

const toObjectId = (value) => {
  if (!value) return null;
  if (value instanceof mongoose.Types.ObjectId) return value;
  if (!mongoose.Types.ObjectId.isValid(value)) return null;
  return new mongoose.Types.ObjectId(value);
};

const getDayBounds = (value = new Date()) => {
  const start = new Date(value);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return { start, end };
};

const getLastDose = async (userId) => {
  const objectId = toObjectId(userId);
  if (!objectId) return null;

  const results = await Track.aggregate([
    {
      $match: {
        userId: objectId,
        "timings.takenAt": { $ne: null },
      },
    },
    { $unwind: "$timings" },
    {
      $match: {
        "timings.takenAt": { $ne: null },
        "timings.status": "taken",
      },
    },
    { $sort: { "timings.takenAt": -1 } },
    { $limit: 1 },
    {
      $lookup: {
        from: "elixirs",
        localField: "elixirId",
        foreignField: "_id",
        as: "elixir",
      },
    },
    { $unwind: { path: "$elixir", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        takenAt: "$timings.takenAt",
        scheduledDate: "$scheduledDate",
        time: "$timings.time",
        status: "$timings.status",
        name: "$elixir.name",
        dosage: "$elixir.dosage",
      },
    },
  ]);

  if (!results || results.length === 0) return null;

  const last = results[0];
  return {
    name: last.name,
    dosage: last.dosage,
    takenAt: last.takenAt,
    scheduledDate: last.scheduledDate,
    time: last.time,
    status: last.status,
  };
};

const getRecentLogs = async (userId) => {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setDate(end.getDate() - 6);
  start.setHours(0, 0, 0, 0);

  return Track.find({
    userId,
    scheduledDate: { $gte: start, $lte: end },
  })
    .populate("elixirId")
    .sort({ scheduledDate: -1 })
    .lean();
};

const getTracksForDay = async (userId, date = new Date()) => {
  const { start, end } = getDayBounds(date);

  return Track.find({
    userId,
    scheduledDate: { $gte: start, $lt: end },
  })
    .populate("elixirId")
    .sort({ scheduledDate: 1 });
};

const getTimingCandidate = ({ track, status, requestedTime }) => {
  const candidates = track.timings
    .map((timing, index) => ({
      timing,
      index,
      distance: requestedTime ? getTimingDistance(requestedTime, timing.time) : null,
    }))
    .filter(({ timing, distance }) => {
      const currentStatus = timing?.status || "pending";
      const canUpdate =
        status === "taken" ? currentStatus !== "taken" : currentStatus === "pending";

      if (!canUpdate) return false;
      if (!requestedTime) return true;
      return isTimingWithinMatchWindow(requestedTime, timing.time);
    })
    .sort((a, b) => {
      if (requestedTime) {
        return a.distance - b.distance;
      }
      return new Date(a.timing.time) - new Date(b.timing.time);
    });

  return candidates[0] || null;
};

const executeMedicationAction = async ({ userId, intent, medications }) => {
  if (!intent?.medication) {
    return {
      answer: buildActionNeedsMedicationMessage(medications),
      action: { type: "track_status_update_needs_medication" },
    };
  }

  await createTracksForDate(userId, new Date());

  const tracks = await getTracksForDay(userId, new Date());
  const medicationId = String(intent.medication._id);
  const matchingTracks = tracks.filter(
    (track) => String(track.elixirId?._id) === medicationId
  );

  if (matchingTracks.length === 0) {
    return {
      answer: `I couldn't find ${intent.medication.name} in today's schedule.`,
      action: {
        type: "track_status_update_not_found",
        medicationName: intent.medication.name,
      },
    };
  }

  let bestMatch = null;

  matchingTracks.forEach((track) => {
    const candidate = getTimingCandidate({
      track,
      status: intent.status,
      requestedTime: intent.requestedTime,
    });

    if (!candidate) return;

    if (!bestMatch) {
      bestMatch = { track, ...candidate };
      return;
    }

    if (intent.requestedTime) {
      if (candidate.distance < bestMatch.distance) {
        bestMatch = { track, ...candidate };
      }
      return;
    }

    if (new Date(candidate.timing.time) < new Date(bestMatch.timing.time)) {
      bestMatch = { track, ...candidate };
    }
  });

  if (!bestMatch) {
    return {
      answer: buildActionNoMatchMessage({
        medicationName: intent.medication.name,
        status: intent.status,
        requestedTime: intent.requestedTime,
      }),
      action: {
        type: "track_status_update_no_match",
        medicationName: intent.medication.name,
        status: intent.status,
      },
    };
  }

  const timingEntry = bestMatch.track.timings[bestMatch.index];
  timingEntry.status = intent.status;
  timingEntry.takenAt = intent.status === "taken" ? new Date() : null;
  await bestMatch.track.save();

  return {
    answer: buildActionSuccessMessage({
      medicationName: bestMatch.track.elixirId?.name || intent.medication.name,
      dosage: bestMatch.track.elixirId?.dosage || "",
      status: intent.status,
      time: timingEntry.time,
    }),
    action: {
      type: "track_status_updated",
      trackId: String(bestMatch.track._id),
      medicationName: bestMatch.track.elixirId?.name || intent.medication.name,
      status: intent.status,
      time: timingEntry.time,
    },
  };
};

const askAI = async (req, res) => {
  try {
    const trimmedQuery = String(req.body?.query || "").trim();
    if (!trimmedQuery) {
      return res.status(400).json({ error: "Query is required." });
    }

    const userId = await getUserId(req);
    if (!userId) {
      return res
        .status(401)
        .json({ error: "Unauthorized: No user ID found in the request." });
    }

    const auth = req.auth?.();
    const sessionId = auth?.sessionId || auth?.userId || String(userId);

    await createTracksForDate(userId, new Date());

    const [medications, lastDose, logs] = await Promise.all([
      Elixir.find({ userId, status: "active" }).sort({ createdAt: -1 }).lean(),
      getLastDose(userId),
      getRecentLogs(userId),
    ]);

    const actionIntent = extractMedicationActionIntent({
      query: trimmedQuery,
      medications,
    });

    if (actionIntent) {
      if (actionIntent.type === "track_status_update_needs_status") {
        return res.status(200).json({
          answer: actionIntent.medication
            ? buildActionNeedsStatusMessage(actionIntent.medication.name)
            : buildActionNeedsMedicationMessage(medications),
          source: "local_action",
          action: {
            type: actionIntent.medication
              ? "track_status_update_needs_status"
              : "track_status_update_needs_medication",
            medicationName: actionIntent.medication?.name || null,
          },
        });
      }

      const actionResult = await executeMedicationAction({
        userId,
        intent: actionIntent,
        medications,
      });

      return res.status(200).json(actionResult);
    }

    const healthData = {
      medications,
      lastDose,
      logs,
    };

    const aiResult = await getAIResponse(trimmedQuery, sessionId, healthData);

    return res.status(200).json(aiResult);
  } catch (error) {
    console.error("AI controller error:", error);
    return res.status(500).json({ error: "Failed to get AI response." });
  }
};

export { askAI };
