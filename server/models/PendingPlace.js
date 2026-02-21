const mongoose = require("mongoose");

const PendingPlaceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true, lowercase: true },
    category: { type: String, trim: true, default: "" },
    address: { type: String, trim: true, default: "" },

    // ✅ admin-like fields
    location: { type: String, trim: true, default: "" },
    emoji: { type: String, trim: true, default: "✨" },
    vibe: { type: String, trim: true, default: "" },
    priceLevel: { type: String, trim: true, default: "" },
    bestTime: { type: String, trim: true, default: "" },
    instagrammable: { type: Boolean, default: false },

    images: { type: [String], default: [] }, // /uploads/... or https...
    instagram: { type: String, trim: true, default: "" },
    tags: { type: [String], default: [] },
    activities: { type: [String], default: [] },
    highlight: { type: String, trim: true, default: "" },
    why: { type: String, trim: true, default: "" },

    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },

    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PendingPlace", PendingPlaceSchema);