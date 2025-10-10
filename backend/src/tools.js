import { Track } from "./models/track.model.js";
import {
  createTracksForDate,
  transformTracksToTimings,
} from "./controllers/track.controller.js";
import { User } from "./models/user.model.js";

async function getTodaysSchedule({ userId, date }) {
  console.log(
    `TOOL EXECUTED: getTodaysSchedule for user: ${userId} on date: ${date}`
  );
  try {
    if (!userId) {
      return {
        success: false,
        message: "Unauthorized: User ID was not provided.",
      };
    }

    const user = await User.findOne({ clerkId: userId });
    if (!user) {
      return { success: false, message: "User not found." };
    }

    const dateParam = date;
    let requestedDate = dateParam ? new Date(dateParam) : new Date();
    requestedDate.setHours(0, 0, 0, 0);
    let nextDate = new Date(requestedDate);
    nextDate.setDate(nextDate.getDate() + 1);

    await createTracksForDate(user._id, requestedDate);

    console.log(user);

    const tracks = await Track.find({
      userId: user._id,
      scheduledDate: { $gte: requestedDate, $lt: nextDate },
    }).populate("elixirId");

    console.log("Tracks found:", tracks);

    const medications = transformTracksToTimings(tracks);

    medications.sort((a, b) => {
      const timeToMinutes = (timeStr) => {
        const [hours, minutes] = timeStr.split(":").map(Number);
        return hours * 60 + minutes;
      };
      return timeToMinutes(a.time) - timeToMinutes(b.time);
    });

    if (medications.length === 0) {
      return {
        success: true,
        schedule: "There are no medications scheduled for this day.",
      };
    }

    return { success: true, schedule: medications };
  } catch (error) {
    console.error("Error in getTodaysSchedule tool:", error);
    return {
      success: false,
      message: "An internal error occurred while fetching the schedule.",
    };
  }
}

async function markMedicationAsTaken({ userId, medicationName }) {
  try {
    if (!userId || !medicationName) {
      return {
        success: false,
        message: "Both userId and medicationName are required.",
      };
    }
    console.log(
      `TOOL EXECUTED: markMedicationAsTaken for user: ${userId}, medication: ${medicationName}`
    );
    // Find user by clerkId
    const user = await User.findOne({ clerkId: userId });
    if (!user) {
      return { success: false, message: "User not found." };
    }

    // Setup date range for query
    let date = new Date();
    let time = null;
    const requestedDate = date ? new Date(date) : new Date();
    requestedDate.setHours(0, 0, 0, 0);
    const nextDate = new Date(requestedDate);
    nextDate.setDate(nextDate.getDate() + 1);

    // Find tracks for this date
    const tracks = await Track.find({
      userId: user._id,
      scheduledDate: { $gte: requestedDate, $lte: nextDate },
    }).populate("elixirId");

    console.log("Tracks found for marking as taken:", tracks);
    // Find the specific timing to mark as taken
    let updated = false;
    for (const track of tracks) {
      if (
        track.elixirId?.name?.toLowerCase() === medicationName.toLowerCase()
      ) {
        console.log(`Found matching medication: ${track.elixirId.name}`);

        // Find the first untaken timing using findIndex to get the actual index
        const isTaken = (status) => status && String(status).toLowerCase() === "taken";
        let timingIndex = -1;
        for (let i = 0; i < track.timings.length; i++) {
          console.log(`Checking timing ${i}:`, track.timings[i]);
          if (!isTaken(track.timings[i].status)) {
            timingIndex = i;
            break;
          }
        }
        console.log("Timing index to update:", timingIndex);


        if (timingIndex !== -1) {
          // Update the actual timing in the track object
          track.timings[timingIndex].status = "taken";
          track.timings[timingIndex].takenAt = new Date();

          // Save the updated track
          await track.save();

          return {
            success: true,
            message: `${medicationName} has been marked as taken at ${track.timings[timingIndex].time}.`,
          };
        }
      }
    }

    // Only reach here if no matching medication or no untaken timing was found
    return {
      success: false,
      message: `Could not find an untaken timing for ${medicationName} in today's schedule.`,
    };
  } catch (error) {
    console.error("Error in markMedicationAsTaken:", error);
    return {
      success: false,
      message: "An error occurred while marking the medication as taken.",
    };
  }
}

const tools = [
  {
    name: "getTodaysSchedule",
    description:
      "Retrieves the user's medication schedule for a specific day. Use this for any questions about what pills or medications to take. If the user doesn't specify a day, assume it's for today.",
    parameters: {
      type: "object",
      properties: {
        date: {
          type: "string",
          description:
            "An optional date in YYYY-MM-DD format. If not provided, today's date will be used.",
        },
      },
    },
    function: getTodaysSchedule,
  },
  {
    name: "markMedicationAsTaken",
    description: "Marks a specific medication as taken in the user's schedule.",
    parameters: {
      type: "object",
      properties: {
        userId: {
          type: "string",
          description: "The clerk ID of the user",
        },
        medicationName: {
          type: "string",
          description: "The name of the medication to mark as taken",
        },
        date: {
          type: "string",
          description: "Optional date in YYYY-MM-DD format. Defaults to today.",
        },
        time: {
          type: "string",
          description:
            "Optional time in HH:mm format. If not provided, marks the next untaken timing.",
        },
      },
      required: ["userId", "medicationName"],
    },
    function: markMedicationAsTaken,
  },
];

export default tools;
