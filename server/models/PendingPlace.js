const mongoose = require("mongoose");

const cleanArray = (arr) =>
  Array.isArray(arr)
    ? arr.map((x) => String(x || "").trim()).filter(Boolean)
    : [];

const cleanLowerArray = (arr) => cleanArray(arr).map((x) => x.toLowerCase());

const PendingPlaceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true, lowercase: true },
    category: { type: String, trim: true, default: "" },
    address: { type: String, trim: true, default: "" },

    location: { type: String, trim: true, default: "" },
    emoji: { type: String, trim: true, default: "✨" },
    vibe: { type: String, trim: true, default: "" },
    priceLevel: { type: String, trim: true, default: "" },
    bestTime: { type: String, trim: true, default: "" },
    instagrammable: { type: Boolean, default: false },

    images: { type: [String], default: [], set: cleanArray },
    instagram: { type: String, trim: true, default: "" },

    tags: { type: [String], default: [], set: cleanLowerArray },
    activities: { type: [String], default: [], set: cleanLowerArray },

    highlight: { type: String, trim: true, default: "" },
    why: { type: String, trim: true, default: "" },

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

PendingPlaceSchema.index({ status: 1, createdAt: -1 });
PendingPlaceSchema.index({ submittedBy: 1, createdAt: -1 });

module.exports = mongoose.model("PendingPlace", PendingPlaceSchema);