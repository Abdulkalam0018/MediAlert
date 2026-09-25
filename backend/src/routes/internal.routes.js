import crypto from "crypto";
import mongoose from "mongoose";
import dayjs from "dayjs";
import { Router } from "express";
import { Elixir } from "../models/elixir.model.js";
import { Track } from "../models/track.model.js";
import { User } from "../models/user.model.js";

const router = Router();

// ── Internal API Key middleware ──────────────────────────────────────────────
// Used by the Python AI agent (agent_tracer.py) — no Clerk session needed.
// Set INTERNAL_API_KEY (24+ random characters) in your backend .env.
// If it is missing or too short, these routes are disabled entirely instead of
// falling back to a guessable default.
const MIN_KEY_LENGTH = 24;

const requireInternalKey = (req, res, next) => {
    const expected = process.env.INTERNAL_API_KEY;
    if (!expected || expected.length < MIN_KEY_LENGTH) {
        return res.status(503).json({ error: "Internal API is disabled (INTERNAL_API_KEY not configured)" });
    }

    const provided = Buffer.from(String(req.get("x-internal-key") || ""));
    const expectedBuf = Buffer.from(expected);

    if (provided.length !== expectedBuf.length || !crypto.timingSafeEqual(provided, expectedBuf)) {
        return res.status(401).json({ error: "Unauthorized: invalid internal key" });
    }
    next();
};

router.use(requireInternalKey);

router.param("userId", (req, res, next, userId) => {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ error: "Invalid userId" });
    }
    next();
});

const internalError = (res, label, err) => {
    console.error(`[internal] ${label}:`, err);
    return res.status(500).json({ error: "Internal server error" });
};

// GET /api/v1/internal/medications/:userId
// Returns all active medications for a user
router.get("/medications/:userId", async (req, res) => {
    try {
        const { userId } = req.params;
        const elixirs = await Elixir.find({ userId, status: "active" }).lean();
        res.json({ success: true, count: elixirs.length, medications: elixirs });
    } catch (err) {
        return internalError(res, "medications", err);
    }
});

// GET /api/v1/internal/today/:userId
// Returns today's dose tracking records for a user
router.get("/today/:userId", async (req, res) => {
    try {
        const { userId } = req.params;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const tracks = await Track.find({
            userId,
            scheduledDate: { $gte: today, $lt: tomorrow },
        })
            .populate("elixirId", "name dosage frequency notes")
            .lean();

        // Flatten timings for easy reading by the AI
        const doses = [];
        tracks.forEach((t) => {
            t.timings.forEach((timing) => {
                doses.push({
                    medication: t.elixirId?.name || "Unknown",
                    dosage: t.elixirId?.dosage || "N/A",
                    scheduledTime: timing.time,
                    status: timing.status,
                    takenAt: timing.takenAt || null,
                });
            });
        });

        res.json({ success: true, date: dayjs(today).format("YYYY-MM-DD"), doses });
    } catch (err) {
        return internalError(res, "today", err);
    }
});

// GET /api/v1/internal/adherence/:userId
// Returns a 7-day adherence summary
router.get("/adherence/:userId", async (req, res) => {
    try {
        const { userId } = req.params;
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        const tracks = await Track.find({
            userId,
            scheduledDate: { $gte: sevenDaysAgo },
        }).lean();

        let total = 0, taken = 0, missed = 0, pending = 0;
        tracks.forEach((t) => {
            t.timings.forEach((timing) => {
                total++;
                if (timing.status === "taken") taken++;
                else if (timing.status === "missed") missed++;
                else pending++;
            });
        });

        const adherenceRate = total > 0 ? Math.round((taken / total) * 100) : 0;

        res.json({
            success: true,
            period: "last_7_days",
            total,
            taken,
            missed,
            pending,
            adherenceRate: `${adherenceRate}%`,
        });
    } catch (err) {
        return internalError(res, "adherence", err);
    }
});

export default router;

