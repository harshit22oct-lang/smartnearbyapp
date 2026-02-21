const mongoose = require("mongoose");

const EventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },

    city: { type: String, required: true, trim: true, lowercase: true },

    category: { type: String, trim: true, default: "" },

    venue: { type: String, trim: true, default: "" },

    address: { type: String, trim: true, default: "" },

    startAt: { type: Date, required: true },

    endAt: { type: Date, default: null },

    bannerImage: { type: String, trim: true, default: "" },

    price: { type: Number, default: 0 },

    capacity: { type: Number, default: 200, min: 1 },

    ticketsSold: { type: Number, default: 0, min: 0 },

    status: {
      type: String,
      enum: ["upcoming", "live", "ended"],
      default: "upcoming",
    },

    isCurated: { type: Boolean, default: false },

    hasTickets: { type: Boolean, default: false },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

// Fast: /api/events?city=bhopal
EventSchema.index({ city: 1, startAt: 1 });

// Fast: upcoming/live filtering
EventSchema.index({ status: 1, city: 1, startAt: 1 });

module.exports = mongoose.model("Event", EventSchema);