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
    scheduleId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Schedule", 
        required: true 
    },
    status: { 
        type: String, 
        enum: ["unknown", "taken", "missed", "delayed"], 
        default: "unknown"
    },
}, {
    timestamps: true
});

export const Track = mongoose.model("Track", trackSchema);
