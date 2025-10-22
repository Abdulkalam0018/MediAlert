import { Elixir } from "../models/elixir.model.js";
import { getUserId } from "../utils/clerk.js"

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
        }

        if(!endDate) {
            endDate = new Date();
            endDate.setDate(endDate.getDate() + 30); // Default to one month from now
        }

        if(!frequency || !["Daily", "Alternate", "Every3Days", "Weekly"].includes(frequency)) {
            frequency = "Daily";
        }

        if(remindersEnabled === undefined || remindersEnabled === null) {
            remindersEnabled = true;
        }

        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);

        // modify timings to be Date objects on startDate
        timings = timings.map(timeStr => {
            const [hours, minutes] = timeStr.split(':').map(Number);
            const timingDate = new Date(startDate);
            timingDate.setHours(hours, minutes, 0, 0);
            return timingDate;
        });

        const newElixir = new Elixir({
            userId: _id,
            name,
            dosage,
            notes,
            timings,
            frequency,
            startDate,
            endDate,
            remindersEnabled
        });

        await newElixir.save();
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

        if(frequency && !["Daily", "Alternate", "Every3Days", "Weekly"].includes(frequency)) {
            frequency = "Daily";
        }

        if(!startDate || isNaN(new Date(startDate).getTime())) { 
            startDate = elixir.startDate;
        }

        if(!endDate || isNaN(new Date(endDate).getTime())) { 
            endDate = elixir.endDate;
        }

        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);

        // modify timings to be Date objects on startDate
        if(timings) {
            timings = timings.map(timeStr => {
                const [hours, minutes] = timeStr.split(':').map(Number);
                const timingDate = new Date(startDate);
                timingDate.setHours(hours, minutes, 0, 0);
                return timingDate;
            });
        }

        elixir.name = name || elixir.name;
        elixir.dosage = dosage || elixir.dosage;
        elixir.notes = notes || elixir.notes;
        elixir.timings = timings || elixir.timings;
        elixir.frequency = frequency || elixir.frequency;
        elixir.startDate = startDate || elixir.startDate;
        elixir.endDate = endDate || elixir.endDate;
        if (remindersEnabled !== undefined) elixir.remindersEnabled = remindersEnabled;
        await elixir.save();

        res.status(200).json({ message: "Elixir updated successfully", elixir });
    } catch (error) {
        console.error("Error updating elixir:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

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

        if (!additionalDays || isNaN(additionalDays) || additionalDays <= 0) {
            return res.status(400).json({ message: "Invalid additionalDays value." });
        }

        elixir.endDate.setDate(elixir.endDate.getDate() + additionalDays);
        await elixir.save();

        res.status(200).json({ message: "Elixir end date extended successfully", elixir });
    } catch (error) {
        console.error("Error extending elixir end date:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

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

        res.status(200).json({ message: "Elixir status toggled successfully", elixir });
    } catch (error) {
        console.error("Error toggling elixir status:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

const deleteElixir = async (req, res) => {
    try {
        const { id } = req.params;
        const user_id = await getUserId(req);

        if (!user_id) {
            return res.status(401).json({ message: "Unauthorized: No user ID found in the request." });
        }

        const elixir = await Elixir.findOneAndDelete({ _id: id, userId: user_id });
        if (!elixir) {
            return res.status(404).json({ message: "Elixir not found." });
        }

        res.status(200).json({ message: "Elixir deleted successfully" });
    } catch (error) {
        console.error("Error deleting elixir:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

export {
    addElixir,
    getElixirs,
    updateElixir,
    extendEndDate,
    toggleStatus,
    deleteElixir,
};