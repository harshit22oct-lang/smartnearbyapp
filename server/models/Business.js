const mongoose = require("mongoose");

const cleanArray = (arr) =>
  Array.isArray(arr)
    ? arr
        .map((x) => String(x || "").trim())
        .filter(Boolean)
    : [];

const cleanLowerArray = (arr) =>
  cleanArray(arr).map((x) => x.toLowerCase());

const BusinessSchema = new mongoose.Schema(
  {
    city: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },

    name: { type: String, required: true, trim: true },
    category: { type: String, default: "", trim: true },
    location: { type: String, default: "", trim: true },

    address: { type: String, default: "", trim: true },
    rating: { type: Number, default: null },

    // old single image support
    imageUrl: { type: String, default: "", trim: true },
    photoRef: { type: String, default: "", trim: true },

    // ✅ multiple curated images (uploaded or links)
    images: { type: [String], default: [] },

    // google place id (optional)
    placeId: { type: String, default: "", trim: true, index: true },

    // mongo/google
    source: { type: String, default: "mongo", trim: true },

    emoji: { type: String, default: "✨", trim: true },
    vibe: { type: String, default: "", trim: true },
    priceLevel: { type: String, default: "", trim: true },
    bestTime: { type: String, default: "", trim: true },
    highlight: { type: String, default: "", trim: true },
    why: { type: String, default: "", trim: true },

    tags: { type: [String], default: [], set: cleanLowerArray },
    activities: { type: [String], default: [], set: cleanLowerArray },

    instagrammable: { type: Boolean, default: false },

    instagram: { type: String, trim: true, default: "" },

    curated: { type: Boolean, default: true },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

// ✅ prevent duplicate saved mongo cards for same google placeId (only when placeId exists)
BusinessSchema.index(
  { placeId: 1 },
  { unique: true, partialFilterExpression: { placeId: { $type: "string", $ne: "" } } }
);

// ✅ performance indexes
BusinessSchema.index({ city: 1, category: 1 });
BusinessSchema.index({ city: 1, source: 1 });

module.exports = mongoose.model("Business", BusinessSchema);