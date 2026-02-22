const mongoose = require("mongoose");

const cleanArray = (arr) =>
  Array.isArray(arr)
    ? arr.map((x) => String(x || "").trim()).filter(Boolean)
    : [];

const cleanLowerArray = (arr) => cleanArray(arr).map((x) => x.toLowerCase());

const PendingEventSchema = new mongoose.Schema(
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

    website: { type: String, trim: true, default: "" },
    instagram: { type: String, trim: true, default: "" },
    contactPhone: { type: String, trim: true, default: "" },
    contactEmail: { type: String, trim: true, default: "" },

    tags: { type: [String], default: [], set: cleanLowerArray },

    hasTickets: { type: Boolean, default: false },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },

    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt: { type: Date, default: null },
    rejectionReason: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

PendingEventSchema.index({ status: 1, createdAt: -1 });
PendingEventSchema.index({ submittedBy: 1, createdAt: -1 });

module.exports = mongoose.model("PendingEvent", PendingEventSchema);
