import { Elixir } from "../models/elixir.model.js";
import { Track } from "../models/track.model.js"
import { getUserFromClerk } from "../utils/clerk.js"

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

        let _id  = req.auth()?.sessionClaims?.mongoUserId;
                
        if(!_id) {
            const user = await getUserFromClerk(req)

            if (!user) {
                return res.status(404).json({ message: "User not found." });
            }

            _id = user._id
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
        let _id  = req.auth()?.sessionClaims?.mongoUserId;

        if (!_id) {
            const user = await getUserFromClerk(req);

            if (!user) {
                return res.status(404).json({ message: "User not found." });
            }

            _id = user._id;
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
        let _id  = req.auth()?.sessionClaims?.mongoUserId;

        if(!_id) {
            const user = await getUserFromClerk(req);

            if (!user) {
                return res.status(404).json({ message: "User not found." });
            }

            _id = user._id;
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

const getTodayTracks = async (req, res) => {
    try {
        let _id  = req.auth()?.sessionClaims?.mongoUserId;

        if(!_id) {

            const user = await getUserFromClerk(req);

            if (!user) {
                return res.status(404).json({ message: "User not found." });
            }

            _id = user._id;
        }
        
        let startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        let endOfToday = new Date();
        endOfToday.setHours(23, 59, 59, 999);

        // Create tracks for today if they don't exist
        await createTracksForDate(_id, startOfToday);

        const tracks = await Track.find({ 
            userId: _id,
            scheduledDate: { $gte: startOfToday, $lte: endOfToday }
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

        let _id  = req.auth()?.sessionClaims?.mongoUserId;

        if(!_id) {
            const user = await getUserFromClerk(req);

            if (!user) {
                return res.status(404).json({ message: "User not found." });
            }

            _id = user._id;
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

export {
    sync,
    getAllTracks,
    getTrackById,
    getTodayTracks,
    updateTrackTimingStatus
};
