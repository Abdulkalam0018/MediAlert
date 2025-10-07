import cron from "node-cron";
import { Elixir } from "../models/elixir.model.js";
import { Track } from "../models/track.model.js";
import dayjs from "dayjs";

cron.schedule("0 0 * * *", async () => {
  console.log(`🔄 Running daily track generation job at ${new Date().toLocaleString()}`);
  const today = dayjs().startOf("day").toDate();

  const activeElixirs = await Elixir.find({
    status: "active",
    endDate: { $gte: today },
  });

  for (const elixir of activeElixirs) {
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
  
      if (tracks.length) await Track.insertMany(tracks);
    
    } catch (error) {
    console.error("Error generating daily tracks:", error);
    continue;
    }
  }
  console.log(`✅ Daily track generation done at ${new Date().toLocaleString()}`);
});
