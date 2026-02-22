const mongoose = require("mongoose");

const cleanArray = (arr) =>
  Array.isArray(arr)
    ? arr.map((x) => String(x || "").trim()).filter(Boolean)
    : [];

const cleanLowerArray = (arr) => cleanArray(arr).map((x) => x.toLowerCase());

const EventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true, lowercase: true },

    category: { type: String, trim: true, default: "" },
    venue: { type: String, trim: true, default: "" },
    address: { type: String, trim: true, default: "" },

    description: { type: String, trim: true, default: "" },
    organizer: { type: String, trim: true, default: "" },

    startAt: { type: Date, required: true },
    endAt: { type: Date, default: null },

    bannerImage: { type: String, trim: true, default: "" },
    images: { type: [String], default: [], set: cleanArray },

    price: { type: Number, default: 0 },
    capacity: { type: Number, default: 200, min: 1 },
    ticketsSold: { type: Number, default: 0, min: 0 },

    status: {
      type: String,
      enum: ["upcoming", "live", "ended"],
      default: "upcoming",
    },

    website: { type: String, trim: true, default: "" },
    instagram: { type: String, trim: true, default: "" },
    contactPhone: { type: String, trim: true, default: "" },
    contactEmail: { type: String, trim: true, default: "" },

    tags: { type: [String], default: [], set: cleanLowerArray },

    isCurated: { type: Boolean, default: false },
    hasTickets: { type: Boolean, default: false },

    // soft-delete / moderation visibility
    isPublished: { type: Boolean, default: true, index: true },
    unpublishedAt: { type: Date, default: null },
    unpublishedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    unpublishedReason: { type: String, trim: true, default: "" },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

EventSchema.index({ city: 1, startAt: 1 });
EventSchema.index({ status: 1, city: 1, startAt: 1 });

module.exports = mongoose.model("Event", EventSchema);
