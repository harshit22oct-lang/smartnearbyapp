const mongoose = require("mongoose");

const TicketSchema = new mongoose.Schema(
  {
    event: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    ticketId: { type: String, required: true, unique: true, index: true },

    amount: { type: Number, default: 0 },
    currency: { type: String, default: "INR" },

    status: { type: String, enum: ["unused", "validated"], default: "unused" },
    scannedAt: { type: Date, default: null },
    scannedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    qrBase64: { type: String, default: "" }, // data:image/png;base64,...

    paymentProvider: { type: String, default: "test" },
    paymentRef: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Ticket", TicketSchema);