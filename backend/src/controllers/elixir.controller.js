import { Elixir } from "../models/elixir.model.js";
import { Track } from "../models/track.model.js";
import { getUserId, notifyRealtimeUser } from "../utils/clerk.js";
import { getRedisClient } from "../config/redis.js";
import { createTracksForDate } from "./track.controller.js";
import { deleteCalendarEventsForUser, syncCalendarForUser } from "../utils/sync.js";

const invalidateUserTracksCache = async (userId) => {
    const redisClient = getRedisClient();
    if (!redisClient) return;
    
    try {
        // Invalidate all track keys for this user using scanIterator
        for await (const key of redisClient.scanIterator({ MATCH: `tracks:${userId}:*` })) {
            await redisClient.del(key);
        }
        console.log(`🧹 Cleared all Redis Track Cache for user ${userId}`);
    } catch (e) {
        console.error("Redis invalidation error:", e);
    }
};

const notifyUserRealtime = (req, userId, payload) => {
    notifyRealtimeUser(req, userId, "trackUpdated", payload);
};

const parseTimingArray = (timings, baseDate) => {
    return timings.map(timeVal => {
        if (timeVal instanceof Date && !isNaN(timeVal.getTime())) {
            return timeVal;
        }
        const timeStr = String(timeVal);
        if (timeStr.includes("T")) {
            const d = new Date(timeStr);
            if (!isNaN(d.getTime())) return d;
        }
        const parts = timeStr.split(':').map(Number);
        if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            const timingDate = new Date(baseDate);
            timingDate.setHours(parts[0], parts[1], 0, 0);
            return timingDate;
        }
        return new Date(timeVal);
    });
};

const addElixir = async (req, res) => {
    try {
        let { name, dosage, notes, timings, frequency, startDate, endDate, remindersEnabled } = req.body;

        const _id = await getUserId(req);

        if (!_id) {
            return res.status(401).json({ message: "Unauthorized: No user ID found in the request." });
        }

        if(!name || !timings) {
            return res.status(400).json({ message: "Name and timings are required." });
        }
        
        if(!Array.isArray(timings) || timings.length === 0) {
            return res.status(400).json({ message: "Timings must be a non-empty array." });
        }

        if(!startDate) {
            startDate = new Date();
        } else {
            startDate = new Date(startDate);
        }

        if(!endDate) {
            endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 30); // Default to one month from now
        } else {
            endDate = new Date(endDate);
        }

        if(!frequency || !["Daily", "Alternate", "Every3Days", "Weekly", "Monthly"].includes(frequency)) {
            frequency = "Daily";
        }

        if(remindersEnabled === undefined || remindersEnabled === null) {
            remindersEnabled = true;
        }

        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);

        const parsedTimings = parseTimingArray(timings, startDate);

        const newElixir = new Elixir({
            userId: _id,
            name,
            dosage,
            notes,
            timings: parsedTimings,
            frequency,
            startDate,
            endDate,
            remindersEnabled
        });

        await newElixir.save();

        // Immediately generate today's track so the medication shows up instantly
        try {
            await createTracksForDate(_id, new Date());
        } catch (trackError) {
            console.error("Error creating immediate track on addElixir:", trackError);
        }

        await invalidateUserTracksCache(_id);
        notifyUserRealtime(req, _id, { action: "add", elixir: newElixir });

        res.status(201).json({ message: "Elixir added successfully", elixir: newElixir });
    } catch (error) {
        console.error("Error adding elixir:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

const getElixirs = async (req, res) => {
    try {
        const _id = await getUserId(req);

        if (!_id) {
            return res.status(401).json({ message: "Unauthorized: No user ID found in the request." });
        }

        const elixirs = await Elixir.find({ userId: _id, status: "active" }).sort({ createdAt: -1 });
        res.status(200).json(elixirs);
    } catch (error) {
        console.error("Error fetching elixirs:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

const updateElixir = async (req, res) => {
    try {
        const { id } = req.params;
        let { name, dosage, notes, timings, frequency, startDate, endDate, remindersEnabled } = req.body;
        const user_id = await getUserId(req);

        if (!user_id) {
            return res.status(401).json({ message: "Unauthorized: No user ID found in the request." });
        }

        const elixir = await Elixir.findOne({ _id: id, userId: user_id });
        if (!elixir) {
            return res.status(404).json({ message: "Elixir not found." });
        }

        if(timings && (!Array.isArray(timings) || timings.length === 0)) {
            return res.status(400).json({ message: "Timings must be a non-empty array." });
        }

        if(frequency && !["Daily", "Alternate", "Every3Days", "Weekly", "Monthly"].includes(frequency)) {
            frequency = "Daily";
        }

        if(!startDate || isNaN(new Date(startDate).getTime())) { 
            startDate = elixir.startDate;
        } else {
            startDate = new Date(startDate);
        }

        if(!endDate || isNaN(new Date(endDate).getTime())) { 
            endDate = elixir.endDate;
        } else {
            endDate = new Date(endDate);
        }

        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);

        let parsedTimings = elixir.timings;
        if(timings) {
            parsedTimings = parseTimingArray(timings, startDate);
        }

        elixir.name = name || elixir.name;
        elixir.dosage = dosage !== undefined ? dosage : elixir.dosage;
        elixir.notes = notes !== undefined ? notes : elixir.notes;
        elixir.timings = parsedTimings;
        elixir.frequency = frequency || elixir.frequency;
        elixir.startDate = startDate || elixir.startDate;
        elixir.endDate = endDate || elixir.endDate;
        if (remindersEnabled !== undefined) elixir.remindersEnabled = remindersEnabled;
        
        await elixir.save();

        // Update today's pending track timings for this elixir so updates reflect immediately
        try {
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date();
            endOfDay.setHours(23, 59, 59, 999);

            const todayTrack = await Track.findOne({
                elixirId: elixir._id,
                scheduledDate: { $gte: startOfDay, $lt: endOfDay }
            });

            if (todayTrack && timings) {
                // Keep whatever the user already logged for times that didn't
                // change (taken, missed or delayed, not only taken), and keep
                // their calendar event so it isn't recreated.
                const timeKey = (value) => {
                    const d = new Date(value);
                    return `${d.getHours()}:${d.getMinutes()}`;
                };
                const previousByTime = new Map();
                todayTrack.timings.forEach(t => previousByTime.set(timeKey(t.time), t));

                const nextTimings = parsedTimings.map(t => {
                    const origTime = new Date(t);
                    const timingDate = new Date(todayTrack.scheduledDate);
                    timingDate.setHours(origTime.getHours(), origTime.getMinutes(), origTime.getSeconds(), 0);
                    const previous = previousByTime.get(timeKey(origTime));
                    previousByTime.delete(timeKey(origTime));
                    if (previous) {
                        return {
                            _id: previous._id,
                            time: timingDate,
                            status: previous.status,
                            takenAt: previous.takenAt || null,
                            calendarEventId: previous.calendarEventId,
                            lastSyncedAt: previous.lastSyncedAt,
                        };
                    }
                    return { time: timingDate, status: 'pending' };
                });

                // Anything left over was removed from the schedule.
                const removedEventIds = [...previousByTime.values()]
                    .map(t => t.calendarEventId)
                    .filter(Boolean);

                todayTrack.timings = nextTimings;
                todayTrack.markModified("timings");
                await todayTrack.save();

                if (removedEventIds.length) {
                    deleteCalendarEventsForUser(user_id, removedEventIds);
                }
                syncCalendarForUser(user_id).catch(() => {});
            } else if (!todayTrack) {
                await createTracksForDate(user_id, new Date());
            }
        } catch (trackUpdateError) {
            console.error("Error updating today's track during updateElixir:", trackUpdateError);
        }

        await invalidateUserTracksCache(user_id);
        notifyUserRealtime(req, user_id, { action: "update", elixir });

        res.status(200).json({ message: "Elixir updated successfully", elixir });
    } catch (error) {
        console.error("Error updating elixir:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

const extendEndDate = async (req, res) => {
    try {
        const { id } = req.params;
        let { additionalDays } = req.body;
        const user_id = await getUserId(req);

        if (!user_id) {
            return res.status(401).json({ message: "Unauthorized: No user ID found in the request." });
        }

        const elixir = await Elixir.findOne({ _id: id, userId: user_id });
        if (!elixir) {
            return res.status(404).json({ message: "Elixir not found." });
        }

        additionalDays = Number(additionalDays);
        if (!Number.isInteger(additionalDays) || additionalDays <= 0) {
            return res.status(400).json({ message: "Invalid additionalDays value." });
        }

        // Number() matters: a JSON string "7" used to be string-concatenated
        // into setDate(getDate() + "7"), e.g. setDate("257").
        const newEndDate = new Date(elixir.endDate);
        newEndDate.setDate(newEndDate.getDate() + additionalDays);
        elixir.endDate = newEndDate;
        await elixir.save();
        await invalidateUserTracksCache(user_id);
        notifyUserRealtime(req, user_id, { action: "extend", elixir });

        res.status(200).json({ message: "Elixir end date extended successfully", elixir });
    } catch (error) {
        console.error("Error extending elixir end date:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

const toggleStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const user_id = await getUserId(req);

        if (!user_id) {
            return res.status(401).json({ message: "Unauthorized: No user ID found in the request." });
        }

        const elixir = await Elixir.findOne({ _id: id, userId: user_id });
        if (!elixir) {
            return res.status(404).json({ message: "Elixir not found." });
        }

        elixir.endDate = new Date();

        if (elixir.status === "active") {
            elixir.status = "completed";
        } else {
            elixir.status = "active";
        }
        await elixir.save();
        await invalidateUserTracksCache(user_id);
        notifyUserRealtime(req, user_id, { action: "toggle", elixir });

        res.status(200).json({ message: "Elixir status toggled successfully", elixir });
    } catch (error) {
        console.error("Error toggling elixir status:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

const deleteElixir = async (req, res) => {
    try {
        const { id } = req.params;
        const user_id = await getUserId(req);

        if (!user_id) {
            return res.status(401).json({ message: "Unauthorized: No user ID found in the request." });
        }

        const elixir = await Elixir.findOne({ _id: id, userId: user_id }).select("_id");
        if (!elixir) {
            return res.status(404).json({ message: "Elixir not found." });
        }

        // Collect today's and future calendar events first: the Elixir model's
        // findOneAndDelete hook removes all of this medication's tracks.
        let eventIds = [];
        try {
            const startOfToday = new Date();
            startOfToday.setHours(0, 0, 0, 0);
            const upcoming = await Track.find({ elixirId: elixir._id, scheduledDate: { $gte: startOfToday } })
                .select("timings.calendarEventId")
                .lean();
            eventIds = upcoming.flatMap(t => t.timings.map(timing => timing.calendarEventId)).filter(Boolean);
        } catch (lookupError) {
            console.error("Error collecting calendar events for deleted elixir:", lookupError);
        }

        const deleted = await Elixir.findOneAndDelete({ _id: id, userId: user_id });
        if (!deleted) {
            return res.status(404).json({ message: "Elixir not found." });
        }

        if (eventIds.length) {
            deleteCalendarEventsForUser(user_id, eventIds);
        }

        await invalidateUserTracksCache(user_id);
        notifyUserRealtime(req, user_id, { action: "delete", elixirId: id });

        res.status(200).json({ message: "Elixir deleted successfully" });
    } catch (error) {
        console.error("Error deleting elixir:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

export {
    addElixir,
    getElixirs,
    updateElixir,
    extendEndDate,
    toggleStatus,
    deleteElixir,
};