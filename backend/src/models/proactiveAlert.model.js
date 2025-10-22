// models/proactiveAlert.model.js
import mongoose, { Schema } from "mongoose";

const proactiveAlertSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    elixirId: {
      type: Schema.Types.ObjectId,
      ref: "Elixir",
      required: true,
    },
    trackId: {
      type: Schema.Types.ObjectId,
      ref: "Track",
      required: true,
    },
    scheduledDate: {
      type: Date,
      required: true,
    },
    timing: {
      type: Date, 
      required: true,
    },
    probabilityMissed: {
      type: Number, // e.g. 0.75 → 75% chance of missing
      required: true,
    },
    threshold: {
      type: Number, // e.g. 0.6 (alert threshold)
      default: 0.6,
    },
    alertStatus: {
      type: String,
      enum: ["not_triggered", "triggered", "acknowledged"],
      default: "not_triggered",
    },
    sentAt: {
      type: Date,
    },
    channel: {
      type: String,
      enum: ["push", "email", "sms"], // for future expansion
      default: "email",
    },
  },
  { timestamps: true }
);

proactiveAlertSchema.index({ userId: 1, scheduledDate: 1, timing: 1 });

export const ProactiveAlert = mongoose.model(
  "ProactiveAlert",
  proactiveAlertSchema
);