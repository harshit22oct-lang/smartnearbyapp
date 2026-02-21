const mongoose = require("mongoose");

const TicketSchema = new mongoose.Schema(
  {
    // ✅ Core relations
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // ✅ Public ticket identifier (your existing UUID)
    // This is fine for display, but NOT secure by itself.
    ticketId: { type: String, required: true, unique: true, index: true },

    // ✅ SECURE QR TOKEN (signed)
    // Put this inside the QR code content (instead of raw ticketId)
    // This is what admin scanner should send to /api/tickets/validate
    qrToken: { type: String, required: true, index: true },

    // ✅ Payment
    amount: { type: Number, default: 0 },
    currency: { type: String, default: "INR" },
    paymentProvider: { type: String, default: "test" },
    paymentRef: { type: String, default: "" },

    // ✅ Ticket state
    // Keep your existing status names for compatibility
    status: { type: String, enum: ["unused", "validated", "cancelled"], default: "unused" },

    // ✅ Scan audit (compat: your old fields)
    scannedAt: { type: Date, default: null },
    scannedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    // ✅ More explicit validation fields (new)
    validatedAt: { type: Date, default: null },
    validatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    // ✅ Optional: quantity support (if you ever sell multiple seats in one ticket)
    qty: { type: Number, default: 1, min: 1 },

    // ✅ Optional: store QR image string if you generate it
    // data:image/png;base64,...
    qrBase64: { type: String, default: "" },

    // ✅ Optional: extra metadata
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

// ✅ Prevent double booking at DB level (same user cannot book same event twice)
TicketSchema.index({ event: 1, user: 1 }, { unique: true });

// ✅ Helpful for “orders” list sorting/filtering
TicketSchema.index({ user: 1, createdAt: -1 });

// ✅ Fast admin validation queries
TicketSchema.index({ status: 1, event: 1, createdAt: -1 });

module.exports = mongoose.model("Ticket", TicketSchema);