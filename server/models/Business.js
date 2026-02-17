const mongoose = require("mongoose");

const BusinessSchema = new mongoose.Schema(
  {
    city: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },

    name: { type: String, required: true },
    category: { type: String, default: "" },
    location: { type: String, default: "" },

    address: { type: String, default: "" },
    rating: { type: Number, default: null },

    // old single image support
    imageUrl: { type: String, default: "" },
    photoRef: { type: String, default: "" },

    // ✅ NEW: multiple curated images (uploaded or links)
    images: { type: [String], default: [] },

    placeId: { type: String, default: "", index: true },
    source: { type: String, default: "mongo" },

    emoji: { type: String, default: "✨" },
    vibe: { type: String, default: "" },
    priceLevel: { type: String, default: "" },
    bestTime: { type: String, default: "" },
    highlight: { type: String, default: "" },
    why: { type: String, default: "" },
    tags: { type: [String], default: [] },
    activities: { type: [String], default: [] },
    instagrammable: { type: Boolean, default: false },

    curated: { type: Boolean, default: true },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Business", BusinessSchema);
