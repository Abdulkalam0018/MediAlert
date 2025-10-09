import mongoose, {Schema} from "mongoose"
import { Track } from "./track.model.js";

const elixirSchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        dosage: {
            type: String,
        },
        notes: {
            type: String,
            trim: true,
        },
        timings: { 
            type: [String], // Array of time strings in 24-hour format (e.g., "09:00", "14:00")
            required: true 
        },
        frequency: {
            type: String,
            enum: ["Daily", "Alternate", "Every3Days", "Weekly", "Monthly"],
            default: "Daily"
        },
        startDate: { 
            type: Date, 
            required: true 
        },
        endDate: { 
            type: Date, 
            required: true 
        }, // ask on frontend for how many days to take the elixir
        remindersEnabled: {
            type: Boolean,
            default: true
        },
        status: {
            type: String,
            enum: ["active", "completed"],
            default: "active"
        }
    },
    {
        timestamps: true
    }
)

elixirSchema.pre("findOneAndDelete", async function (next) {
  const elixir = await this.model.findOne(this.getFilter());
  if (elixir) {
    await Track.deleteMany({ elixirId: elixir._id });
  }
  next();
});

export const Elixir = mongoose.model("Elixir", elixirSchema)