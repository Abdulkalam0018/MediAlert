import mongoose, { Schema } from "mongoose";

const scheduleSchema = new Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User", 
        required: true 
    },
    elixirId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Elixir",
        required: true,
    },
    timings: { 
        type: [String], // Array of time strings in 24-hour format (e.g., "09:00", "14:00")
        required: true 
    },
    daysGap: { 
        type: Number, // 0 for daily, 1 for alternate days, etc.
        default: 0
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
}, {
    timestamps: true
});

export const Schedule = mongoose.model("Schedule", scheduleSchema);
