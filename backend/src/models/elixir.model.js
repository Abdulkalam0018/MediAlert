import mongoose, {Schema} from "mongoose"

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
        },
        timings: { 
            type: [String], // Array of time strings in 24-hour format (e.g., "09:00", "14:00")
            required: true 
        },
        frequency: {
            type: String,
            enum: ["daily", "alternate", "every3Days", "weekly"],
            default: "daily"
        },
        startDate: { 
            type: Date, 
            required: true 
        },
        endDate: { 
            type: Date, 
            required: true 
        },
        remindersEnabled: {
            type: Boolean,
            default: true
        },
        status: {
            type: String,
            enum: ["active", "paused", "completed"],
            default: "active"
        }
    },
    {
        timestamps: true
    }
)

export const Elixir = mongoose.model("Elixir", elixirSchema)