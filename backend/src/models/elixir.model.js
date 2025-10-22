import mongoose, {Schema} from "mongoose"
import { Track } from "./track.model.js";

const elixirSchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
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
            type: [Date],
            required: true 
        },
        frequency: {
            type: String,
            enum: ["Daily", "Alternate", "Every3Days", "Weekly", "Monthly"],
            default: "Daily"
        },
        startDate: { 
            type: Date, 
            required: true,
            validate: {
                validator: function (value) {
                    const createdAt = this.createdAt || new Date();
                    const minAllowed = new Date(createdAt.getTime() - 30 * 24 * 60 * 60 * 1000);
                    return value >= minAllowed;
                },
                message: "Start date cannot be more than 30 days before creation date.",
            },
        },
        endDate: {
            type: Date,
            required: true,
            validate: [
                {
                    validator: function (value) {
                        const maxAllowed = new Date();
                        maxAllowed.setFullYear(maxAllowed.getFullYear() + 1);
                        return value <= maxAllowed;
                    },
                    message: "End date cannot be more than 1 year from today.",
                },
                {
                    validator: function (value) {
                        return !this.startDate || value > this.startDate;
                    },
                    message: "End date must be after start date.",
                },
            ],
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