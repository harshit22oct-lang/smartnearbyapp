const mongoose = require("mongoose");

const PendingPlaceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true, lowercase: true },
    category: { type: String, trim: true, default: "" },
    address: { type: String, trim: true, default: "" },

    images: { type: [String], default: [] }, // /uploads/...
    instagram: { type: String, trim: true, default: "" },
    tags: { type: [String], default: [] },
    activities: { type: [String], default: [] },
    highlight: { type: String, trim: true, default: "" },
    why: { type: String, trim: true, default: "" },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PendingPlace", PendingPlaceSchema);