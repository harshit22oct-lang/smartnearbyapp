const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");

const { v4: uuidv4 } = require("uuid");
const QRCode = require("qrcode");

const Event = require("../models/Event");
const Ticket = require("../models/Ticket");

const isAdmin = (req) => !!req.user?.isAdmin;

// ✅ Book ticket/pass (Phase 1: no payment, works for free & paid as "test")
// POST /api/tickets/book  { eventId }
router.post("/book", protect, async (req, res) => {
  try {
    const { eventId } = req.body || {};
    if (!eventId) return res.status(400).json({ message: "eventId required" });

    const ev = await Event.findById(eventId);
    if (!ev) return res.status(404).json({ message: "Event not found" });

    // ✅ show button only when curated+hasTickets (also enforce here)
    if (!ev.isCurated || !ev.hasTickets) {
      return res.status(400).json({ message: "Tickets not available for this event" });
    }

    const ticketId = uuidv4();
    const qrBase64 = await QRCode.toDataURL(ticketId); // png base64

    const created = await Ticket.create({
      event: ev._id,
      user: req.user.id,
      ticketId,
      amount: ev.price || 0,
      currency: "INR",
      status: "unused",
      qrBase64,
      paymentProvider: "test",
    });

    return res.status(201).json({ message: "Booked", ticket: created });
  } catch (err) {
    console.error("Book ticket error:", err);
    return res.status(500).json({ message: "Server error (book ticket)" });
  }
});

// ✅ User orders list
// GET /api/tickets/mine
router.get("/mine", protect, async (req, res) => {
  try {
    const list = await Ticket.find({ user: req.user.id })
      .populate("event")
      .sort({ createdAt: -1 })
      .limit(200);

    return res.json(list);
  } catch (err) {
    console.error("Mine tickets error:", err);
    return res.status(500).json({ message: "Server error (mine tickets)" });
  }
});

// ✅ Ticket details (user own OR admin)
// GET /api/tickets/:id
router.get("/:id", protect, async (req, res) => {
  try {
    const t = await Ticket.findById(req.params.id)
      .populate("event")
      .populate("user", "name email profilePicture");

    if (!t) return res.status(404).json({ message: "Ticket not found" });

    if (!isAdmin(req) && String(t.user?._id) !== String(req.user.id)) {
      return res.status(403).json({ message: "Not allowed" });
    }

    return res.json(t);
  } catch (err) {
    console.error("Ticket detail error:", err);
    return res.status(500).json({ message: "Server error (ticket detail)" });
  }
});

// ✅ Admin validate (scan)
// POST /api/tickets/:id/validate
router.post("/:id/validate", protect, async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ message: "Admin only" });

    const t = await Ticket.findById(req.params.id)
      .populate("event")
      .populate("user", "name email profilePicture");

    if (!t) return res.status(404).json({ message: "Ticket not found" });

    if (t.status === "validated") {
      return res.json({
        ok: false,
        message: `Already Verified at ${t.scannedAt ? new Date(t.scannedAt).toLocaleString() : ""}`,
        ticket: t,
      });
    }

    t.status = "validated";
    t.scannedAt = new Date();
    t.scannedBy = req.user.id;
    await t.save();

    return res.json({ ok: true, message: "Verified ✅", ticket: t });
  } catch (err) {
    console.error("Validate error:", err);
    return res.status(500).json({ message: "Server error (validate)" });
  }
});

module.exports = router;