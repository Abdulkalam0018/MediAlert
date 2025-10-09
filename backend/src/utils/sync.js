import { Elixir } from "../models/elixir.model.js";
import { Track } from "../models/track.model.js";
import dayjs from "dayjs";

const processElixirsAndGenerateTracks = async (elixirs) => {
  const today = dayjs().startOf("day").toDate();
  let tracksCreated = 0;

  for (const elixir of elixirs) {
    try {
      // check the latest track entry for this elixir
      const lastTrack = await Track.findOne({ elixirId: elixir._id })
        .sort({ scheduledDate: -1 })
        .lean();
  
      // determine from which date to start generating
      let startDate = elixir.startDate;
      if (lastTrack) {
        const nextDate = dayjs(lastTrack.scheduledDate).add(1, "day").toDate();
        if (nextDate > today) continue; // already up to date
        startDate = nextDate;
      }
  
      // create tracks up to today
      const datesToGenerate = [];
      for (let d = dayjs(startDate); d.isBefore(dayjs(today)) || d.isSame(today); d = d.add(1, "day")) {
        if (d.toDate() > elixir.endDate) break;
  
        if (elixir.frequency === "Alternate" && d.diff(dayjs(elixir.startDate), "day") % 2 !== 0) continue;
        if (elixir.frequency === "Every3Days" && d.diff(dayjs(elixir.startDate), "day") % 3 !== 0) continue;
        if (elixir.frequency === "Weekly" && d.diff(dayjs(elixir.startDate), "week") % 1 !== 0) continue;
        if (elixir.frequency === "Monthly" && d.date() !== dayjs(elixir.startDate).date()) continue;
  
        datesToGenerate.push(d.toDate());
      }
  
      const tracks = datesToGenerate.map((scheduledDate) => ({
        userId: elixir.userId,
        elixirId: elixir._id,
        scheduledDate,
        timings: elixir.timings.map(time => ({ time }))
      }));
  
      if (tracks.length) {
        await Track.insertMany(tracks);
        tracksCreated += tracks.length;
      }
    
    } catch (error) {
      console.error(`Error generating tracks for elixir ${elixir._id}:`, error);
      continue;
    }
  }

  return tracksCreated;
};

/**
 * Generates daily tracks for all active elixirs
 * This function handles the complete logic for creating track entries
 * based on elixir schedules and frequencies
 */
const generateDailyTracks = async () => {
  console.log(`🔄 Running daily track generation job at ${new Date().toLocaleString()}`);
  const today = dayjs().startOf("day").toDate();

  try {
    const activeElixirs = await Elixir.find({
      status: "active",
      endDate: { $gte: today },
    });

    const tracksCreated = await processElixirsAndGenerateTracks(activeElixirs);
    
    console.log(`✅ Daily track generation done at ${new Date().toLocaleString()}. Created ${tracksCreated} tracks.`);
  } catch (error) {
    console.error("Error in generateDailyTracks:", error);
    throw error;
  }
};

const generateDailyTracksOfUser = async (userId) => {
  console.log(`🔄 Running daily track generation job for user ${userId} at ${new Date().toLocaleString()}`);
  const today = dayjs().startOf("day").toDate();

  try {
    const activeElixirs = await Elixir.find({
      userId,
      status: "active",
      endDate: { $gte: today },
    });

    const tracksCreated = await processElixirsAndGenerateTracks(activeElixirs);
    
    console.log(`✅ Daily track generation done for user ${userId} at ${new Date().toLocaleString()}. Created ${tracksCreated} tracks.`);
  } catch (error) {
    console.error("Error in generateDailyTracksOfUser:", error);
    throw error;
  }
};

export { 
    generateDailyTracks,
    generateDailyTracksOfUser
};