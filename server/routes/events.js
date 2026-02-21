const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");

const Event = require("../models/Event");

const normCity = (s) => String(s || "").trim().toLowerCase();

// ✅ Public: list events by city (+ optional search)
// GET /api/events?city=bhopal&q=fest
router.get("/", async (req, res) => {
  try {
    const city = normCity(req.query.city);
    const q = String(req.query.q || "").trim();

    const filter = {};
    if (city) filter.city = city;

    if (q) {
      filter.$or = [
        { title: { $regex: q, $options: "i" } },
        { category: { $regex: q, $options: "i" } },
        { venue: { $regex: q, $options: "i" } },
        { address: { $regex: q, $options: "i" } },
      ];
    }

    const list = await Event.find(filter).sort({ startAt: 1 }).limit(80);
    return res.json(list);
  } catch (err) {
    console.error("Events list error:", err);
    return res.status(500).json({ message: "Server error (events list)" });
  }
});

// ✅ Admin: create event
// POST /api/events
router.post("/", protect, async (req, res) => {
  try {
    if (!req.user?.isAdmin) return res.status(403).json({ message: "Admin only" });

    const b = req.body || {};
    const payload = {
      title: String(b.title || "").trim(),
      city: normCity(b.city),
      category: String(b.category || "").trim(),
      venue: String(b.venue || "").trim(),
      address: String(b.address || "").trim(),
      startAt: b.startAt ? new Date(b.startAt) : null,
      endAt: b.endAt ? new Date(b.endAt) : null,
      bannerImage: String(b.bannerImage || "").trim(),
      price: Number(b.price || 0),
      capacity: Number(b.capacity || 200),
      isCurated: !!b.isCurated,
      hasTickets: !!b.hasTickets,
      createdBy: req.user?.id || null,
    };

    if (!payload.title) return res.status(400).json({ message: "title required" });
    if (!payload.city) return res.status(400).json({ message: "city required" });
    if (!payload.startAt || isNaN(payload.startAt.getTime()))
      return res.status(400).json({ message: "startAt required" });

    const created = await Event.create(payload);
    return res.status(201).json(created);
  } catch (err) {
    console.error("Create event error:", err);
    return res.status(500).json({ message: "Server error (create event)" });
  }
});

module.exports = router;