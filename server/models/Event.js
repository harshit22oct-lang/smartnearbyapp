const mongoose = require("mongoose");

const EventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true, lowercase: true },

    category: { type: String, trim: true, default: "" }, // Concert, Fest, Workshop
    venue: { type: String, trim: true, default: "" },
    address: { type: String, trim: true, default: "" },

    startAt: { type: Date, required: true },
    endAt: { type: Date, default: null },

    bannerImage: { type: String, trim: true, default: "" },

    price: { type: Number, default: 0 }, // 0 => free pass
    capacity: { type: Number, default: 200 },

    // ✅ button rules
    isCurated: { type: Boolean, default: false },
    hasTickets: { type: Boolean, default: false },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Event", EventSchema);