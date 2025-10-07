import { Elixir } from "../models/elixir.model.js";
import { Track } from "../models/track.model.js"
import { getUserFromClerk } from "../utils/clerk.js"

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

        const elixirs = await Elixir.find({ userId: _id });
        if (elixirs.length === 0) {
            return res.status(200).json({ message: "No elixirs found for the user. Please add elixirs first." });
        }

        let createdTracks = [];

        for (const elixir of elixirs) {
            const existingTrack = await Track.findOne({ elixirId: elixir._id, scheduledDate });

            if (existingTrack) {
                return res.status(200).json({
                    message: "Track for this elixir on the specified date already exists.",
                    track: existingTrack
                });
            }

            const timings = elixir.timings.map(time => ({ time }));

            const newTrack = new Track({
                userId: _id,
                elixirId: elixir._id,
                scheduledDate,
                timings
            });

            createdTracks.push(newTrack);
        }

        await Track.insertMany(createdTracks);
        return res.status(201).json({ message: "Tracks created successfully.", tracks: createdTracks });

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

        const tracks = await Track.find({ userId: _id });
        return res.status(200).json({ tracks });
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

        const track = await Track.findOne({ _id: id, userId: _id });
        if (!track) {
            return res.status(404).json({ message: "Track not found or does not belong to the user." });
        }

        return res.status(200).json({ track });
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

        const tracks = await Track.find({ 
            userId: _id,
            scheduledDate: { $gte: startOfToday, $lte: endOfToday }
        });
        return res.status(200).json({ tracks });
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
