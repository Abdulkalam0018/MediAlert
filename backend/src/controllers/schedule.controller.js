import { Schedule } from "../models/schedule.model.js";
import { Elixir } from "../models/elixir.model.js";
import { getUserFromClerk } from "../utils/clerk.js"

const createSchedule = async (req, res) => {
    try {
        let user_id  = req.auth()?.sessionClaims?.mongoUserId;

        if(!user_id) {
            const user = await getUserFromClerk(req)

            if (!user) {
                return res.status(404).json({ message: "User not found." });
            }

            user_id = user._id
        }

        const { elixirId, timings, daysGap, startDate, endDate, remindersEnabled  } = req.body;

        const elixir = await Elixir.findOne({ _id: elixirId, userId: user_id });

        if (!elixir) {
            return res.status(404).json({ message: "Elixir not found or does not belong to the user." });
        }

        const newSchedule = new Schedule({
            userId: user_id,
            elixirId,
            timings,
            daysGap,
            startDate,
            endDate,
            remindersEnabled 
        });
        await newSchedule.save();
        res.status(201).json(newSchedule);
    }   
    catch (error) {
        console.error("Error creating schedule:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

const getSchedules = async (req, res) => {
    try {
        let user_id  = req.auth()?.sessionClaims?.mongoUserId;

        if(!user_id) {
            const user = await getUserFromClerk(req)

            if (!user) {
                return res.status(404).json({ message: "User not found." });
            }

            user_id = user._id
        }

        const schedules = await Schedule.find({ userId: user_id });
        res.status(200).json(schedules);
    } catch (error) {
        console.error("Error fetching schedules:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

export { 
    createSchedule, 
    getSchedules 
};