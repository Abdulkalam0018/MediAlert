import { Elixir } from "../models/elixir.model.js";
import { Track } from "../models/track.model.js"
import { getUserId } from "../utils/clerk.js"
import { generateDailyTracksOfUser } from "../utils/sync.js"

// Utility function to transform tracks into timing-based documents
const transformTracksToTimings = (tracks) => {
    const timings = [];
    
    tracks.forEach(track => {
        track.timings.forEach(timing => {
            timings.push({
                _id: timing._id,
                trackId: track._id,
                userId: track.userId,
                scheduledDate: track.scheduledDate,
                time: timing.time,
                status: timing.status || 'pending',
                takenAt: timing.takenAt || null,
                // Flatten elixir data directly into the object
                elixirId: track.elixirId._id,
                name: track.elixirId.name,
                dosage: track.elixirId.dosage,
                notes: track.elixirId.notes,
                frequency: track.elixirId.frequency,
                startDate: track.elixirId.startDate,
                endDate: track.elixirId.endDate,
                remindersEnabled: track.elixirId.remindersEnabled,
                createdAt: track.createdAt,
                updatedAt: track.updatedAt
            });
        });
    });

    return timings;
};

const createTracksForDate = async (userId, scheduledDate) => {
    const elixirs = await Elixir.find({ userId });
    if (elixirs.length === 0) {
        return { success: false, message: "No elixirs found for the user. Please add elixirs first." };
    }

    let createdTracks = [];

    for (const elixir of elixirs) {
        const existingTrack = await Track.findOne({ elixirId: elixir._id, scheduledDate });

        if (existingTrack) {
            continue; // Skip if track already exists
        }

        const timings = elixir.timings.map(time => ({ time }));

        const newTrack = new Track({
            userId,
            elixirId: elixir._id,
            scheduledDate,
            timings
        });

        createdTracks.push(newTrack);
    }

    if (createdTracks.length > 0) {
        await Track.insertMany(createdTracks);
    }

    return { success: true, tracks: createdTracks };
};

const sync = async (req, res) => {
    try {
        let scheduledDate = req?.body?.scheduledDate ? new Date(req.body.scheduledDate) : null;

        const _id = await getUserId(req);

        if (!_id) {
            return res.status(401).json({ message: "Unauthorized: No user ID found in the request." });
        }
        
        if(!scheduledDate) {
            scheduledDate = new Date();
            scheduledDate.setHours(0, 0, 0, 0);
        }

        const result = await createTracksForDate(_id, scheduledDate);
        
        if (!result.success) {
            return res.status(200).json({ message: result.message });
        }

        if (result.tracks.length === 0) {
            return res.status(200).json({ message: "All tracks for today already exist." });
        }

        return res.status(201).json({ message: "Tracks created successfully.", tracks: result.tracks });

    } catch (error) {
        console.error("Error creating track:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
};

const getAllTracks = async (req, res) => {
    try {
        const _id = await getUserId(req);

        if (!_id) {
            return res.status(401).json({ message: "Unauthorized: No user ID found in the request." });
        }

        const tracks = await Track.find({ userId: _id }).populate('elixirId');
        const medications = transformTracksToTimings(tracks);

        return res.status(200).json({ medications });
    } catch (error) {
        console.error("Error fetching tracks:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
};

const getTrackById = async (req, res) => {
    try {
        const { id } = req.params;

        const _id = await getUserId(req);

        if (!_id) {
            return res.status(401).json({ message: "Unauthorized: No user ID found in the request." });
        }

        const track = await Track.findOne({ _id: id, userId: _id }).populate('elixirId');
        if (!track) {
            return res.status(404).json({ message: "Track not found or does not belong to the user." });
        }

        const medications = transformTracksToTimings([track]);

        return res.status(200).json({ medications });
    } catch (error) {
        console.error("Error fetching track:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
};

const getTracksByDate = async (req, res) => {
    try {
        const _id = await getUserId(req);

        if (!_id) {
            return res.status(401).json({ message: "Unauthorized: No user ID found in the request." });
        }

        const dateParam = req.params?.date;

        let requestedDate = dateParam ? new Date(dateParam) : new Date();
        requestedDate.setHours(0, 0, 0, 0);
        let nextDate = new Date(requestedDate);
        nextDate.setDate(nextDate.getDate() + 1);
        nextDate.setHours(0, 0, 0, 0);

        // Create tracks for today if they don't exist
        await createTracksForDate(_id, requestedDate);

        const tracks = await Track.find({ 
            userId: _id,
            scheduledDate: { $gte: requestedDate, $lt: nextDate }
        }).populate('elixirId');

        const medications = transformTracksToTimings(tracks);

        medications.sort((a, b) => {
            // Convert time strings to minutes for proper comparison
            const timeToMinutes = (timeStr) => {
                const [hours, minutes] = timeStr.split(':').map(Number);
                return hours * 60 + minutes;
            };
            
            return timeToMinutes(a.time) - timeToMinutes(b.time);
        });

        return res.status(200).json({ medications });
    } catch (error) {
        console.error("Error fetching today's tracks:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
};

const updateTrackTimingStatus = async (req, res) => {

    try {
        const { id } = req.params;
        const { time, status } = req.body;

        const _id = await getUserId(req);

        if (!_id) {
            return res.status(401).json({ message: "Unauthorized: No user ID found in the request." });
        }

        const track = await Track.findOne({ _id: id, userId: _id });
        if (!track) {
            return res.status(404).json({ message: "Track not found or does not belong to the user." });
        }

        const timingEntry = track.timings.find(t => t.time === time);
        if (!timingEntry) {
            return res.status(404).json({ message: "Timing entry not found for the specified time." });
        }

        timingEntry.status = status;
        if (status === "taken") {
            timingEntry.takenAt = new Date();
        } else {
            timingEntry.takenAt = null;
        }

        await track.save();
        return res.status(200).json({ message: "Track timing status updated successfully.", track });
    } catch (error) {
        console.error("Error updating track timing status:", error);
        return res.status(500).json({ message: "Internal server error." });
    }   
};


// Adherence Feature

const getAdherenceData = async (req, res) => {
    try {
        const _id = await getUserId(req);

        if (!_id) {
            return res.status(401).json({ message: "Unauthorized: No user ID found in the request." });
        }

        await generateDailyTracksOfUser(_id)

        const tracks = await Track.find({ userId: _id }).sort({ scheduledDate: -1 });

        let totalDoses = 0;
        let takenDoses = 0;
        let missedDoses = 0;
        let delayedDoses = 0;
        
        let todaysTotalDoses = 0;
        let todaysTakenDoses = 0;
        let todaysMissedDoses = 0;
        let todaysDelayedDoses = 0;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        tracks.map(track => {
            totalDoses += track.timings.length;
            takenDoses += track.timings.filter(t => t.status === "taken").length;
            missedDoses += track.timings.filter(t => t.status === "missed").length;
            delayedDoses += track.timings.filter(t => t.status === "delayed").length;

            if (track.scheduledDate.getDate() === today.getDate()) {
                todaysTotalDoses += track.timings.length;
                todaysTakenDoses += track.timings.filter(t => t.status === "taken").length;
                todaysMissedDoses += track.timings.filter(t => t.status === "missed").length;
                todaysDelayedDoses += track.timings.filter(t => t.status === "delayed").length;
            }
        });

        const activeElixirs = await Elixir.find({ userId: _id, status: "active" })

        // Calculate adherence streak
        const streak = calculateAdherenceStreak(tracks, today);

        const adherenceData = {
            totalDoses,
            takenDoses,
            missedDoses,
            delayedDoses,
            adherenceRate: totalDoses > 0 ? (((takenDoses + delayedDoses) / totalDoses) * 100).toFixed(2) : "0.00",
            todaysTotalDoses,
            todaysTakenDoses,
            todaysMissedDoses,
            todaysDelayedDoses,
            activeMedications: activeElixirs.length,
            streak: streak
        };

        return res.status(200).json({ adherenceData });
    } catch (error) {
        console.error("Error fetching adherence data:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
};

// Helper function to calculate adherence streak
const calculateAdherenceStreak = (tracks, fromDate) => {
    if (tracks.length === 0) {
        return 0;
    }

    let lastNonAdherentDate = null;
    
    for (const track of tracks) {
        // Skip today's tracks and any future tracks
        if (track.scheduledDate >= fromDate) {
            continue;
        }
        
        // Check if this track has any missed or pending timings
        const hasNonAdherentTiming = track.timings.some(timing => 
            timing.status === 'missed' || timing.status === 'pending'
        );
        
        if (hasNonAdherentTiming) {
            lastNonAdherentDate = track.scheduledDate;
            break;
        }
    }
    
    // If no non-adherent date found, streak goes back to the earliest track
    if (!lastNonAdherentDate) {
        const earliestTrack = tracks[tracks.length - 1];
        if (!earliestTrack || earliestTrack.scheduledDate.toDateString() === fromDate.toDateString()) {
            return 0;
        }
        // Calculate days from earliest track to yesterday
        const yesterday = new Date(fromDate);
        yesterday.setDate(yesterday.getDate() - 1);
        const timeDiff = yesterday.getTime() - earliestTrack.scheduledDate.getTime();
        return Math.floor(timeDiff / (1000 * 3600 * 24)) + 1;
    }
    
    // Calculate days between last non-adherent date and yesterday
    const yesterday = new Date(fromDate);
    yesterday.setDate(yesterday.getDate() - 1);
    const timeDiff = yesterday.getTime() - lastNonAdherentDate.getTime();
    return Math.floor(timeDiff / (1000 * 3600 * 24));
};

export {
    sync,
    getAllTracks,
    getTrackById,
    getTracksByDate,
    updateTrackTimingStatus,
    getAdherenceData,
    createTracksForDate,
    transformTracksToTimings
};
