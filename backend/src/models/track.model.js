import mongoose, { Schema } from "mongoose";

const trackSchema = new Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User", 
        required: true 
    },
    elixirId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Elixir", 
        required: true 
    },
    scheduledDate: { 
        type: Date, 
        required: true
    },
    timings: [
        {
            time: { type: String, required: true }, // "09:00", "14:00"
            status: { type: String, enum: ["pending", "taken", "missed", "delayed"], default: "pending" },
            takenAt: { type: Date }
        }
    ]
}, {
    timestamps: true
});

trackSchema.index({ elixirId: 1, scheduledDate: 1 }, { unique: true })

export const Track = mongoose.model("Track", trackSchema);
