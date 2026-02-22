const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");

const Event = require("../models/Event");

const normCity = (s) => String(s || "").trim().toLowerCase();
const isAdmin = (req) => !!req.user?.isAdmin;

const toList = (v) =>
  Array.isArray(v)
    ? v.map((x) => String(x || "").trim()).filter(Boolean)
    : String(v || "")
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);

// Public: list events by city (+ optional search)
// GET /api/events?city=bhopal&q=fest
router.get("/", async (req, res) => {
  try {
    const city = normCity(req.query.city);
    const q = String(req.query.q || "").trim();

    const filter = {};
    if (city) filter.city = city;
    filter.isPublished = { $ne: false };

    if (q) {
      filter.$or = [
        { title: { $regex: q, $options: "i" } },
        { category: { $regex: q, $options: "i" } },
        { venue: { $regex: q, $options: "i" } },
        { address: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
        { tags: { $regex: q, $options: "i" } },
      ];
    }

    const showEnded = String(req.query.showEnded || "").trim() === "1";
    if (!showEnded) filter.status = { $ne: "ended" };

    const list = await Event.find(filter).sort({ startAt: 1 }).limit(80).lean();
    return res.json(list);
  } catch (err) {
    console.error("Events list error:", err);
    return res.status(500).json({ message: "Server error (events list)" });
  }
});

// Public: single event
// GET /api/events/:id
router.get("/:id", async (req, res) => {
  try {
    const ev = await Event.findById(req.params.id).lean();
    if (!ev) return res.status(404).json({ message: "Event not found" });
    if (ev.isPublished === false) return res.status(404).json({ message: "Event not found" });
    return res.json(ev);
  } catch (err) {
    console.error("Event detail error:", err);
    return res.status(500).json({ message: "Server error (event detail)" });
  }
});

// Admin: create event
// POST /api/events
router.post("/", protect, async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ message: "Admin only" });

    const b = req.body || {};
    const startAt = b.startAt ? new Date(b.startAt) : null;
    const endAt = b.endAt ? new Date(b.endAt) : null;
    const images = toList(b.images);

    const payload = {
      title: String(b.title || "").trim(),
      city: normCity(b.city),
      category: String(b.category || "").trim(),
      venue: String(b.venue || "").trim(),
      address: String(b.address || "").trim(),

      description: String(b.description || "").trim(),
      organizer: String(b.organizer || "").trim(),

      startAt,
      endAt: endAt && !isNaN(endAt.getTime()) ? endAt : null,

      bannerImage: String(b.bannerImage || images[0] || "").trim(),
      images,

      price: Number(b.price || 0),
      capacity: Number(b.capacity || 200),
      ticketsSold: Number(b.ticketsSold || 0),
      status: String(b.status || "upcoming"),

      website: String(b.website || "").trim(),
      instagram: String(b.instagram || "").trim(),
      contactPhone: String(b.contactPhone || "").trim(),
      contactEmail: String(b.contactEmail || "").trim(),
      tags: toList(b.tags),

      isCurated: !!b.isCurated,
      hasTickets: !!b.hasTickets,
      isPublished: true,
      createdBy: req.user?.id || null,
    };

    if (!payload.title) return res.status(400).json({ message: "title required" });
    if (!payload.city) return res.status(400).json({ message: "city required" });
    if (!payload.startAt || isNaN(payload.startAt.getTime())) {
      return res.status(400).json({ message: "startAt required" });
    }

    if (payload.endAt && payload.endAt < payload.startAt) {
      return res.status(400).json({ message: "endAt cannot be before startAt" });
    }

    if (payload.capacity < 1) payload.capacity = 1;
    if (payload.ticketsSold < 0) payload.ticketsSold = 0;

    const created = await Event.create(payload);
    return res.status(201).json(created);
  } catch (err) {
    console.error("Create event error:", err);
    return res.status(500).json({ message: "Server error (create event)" });
  }
});

// Admin: update event
// PUT /api/events/:id
router.put("/:id", protect, async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ message: "Admin only" });

    const b = req.body || {};
    const patch = {};

    if (b.title !== undefined) patch.title = String(b.title || "").trim();
    if (b.city !== undefined) patch.city = normCity(b.city);
    if (b.category !== undefined) patch.category = String(b.category || "").trim();
    if (b.venue !== undefined) patch.venue = String(b.venue || "").trim();
    if (b.address !== undefined) patch.address = String(b.address || "").trim();
    if (b.description !== undefined) patch.description = String(b.description || "").trim();
    if (b.organizer !== undefined) patch.organizer = String(b.organizer || "").trim();

    if (b.startAt !== undefined) patch.startAt = b.startAt ? new Date(b.startAt) : null;
    if (b.endAt !== undefined) patch.endAt = b.endAt ? new Date(b.endAt) : null;

    if (b.images !== undefined) patch.images = toList(b.images);
    if (b.bannerImage !== undefined) patch.bannerImage = String(b.bannerImage || "").trim();

    if (b.price !== undefined) patch.price = Number(b.price || 0);
    if (b.capacity !== undefined) patch.capacity = Number(b.capacity || 200);
    if (b.ticketsSold !== undefined) patch.ticketsSold = Number(b.ticketsSold || 0);
    if (b.status !== undefined) patch.status = String(b.status || "upcoming");

    if (b.website !== undefined) patch.website = String(b.website || "").trim();
    if (b.instagram !== undefined) patch.instagram = String(b.instagram || "").trim();
    if (b.contactPhone !== undefined) patch.contactPhone = String(b.contactPhone || "").trim();
    if (b.contactEmail !== undefined) patch.contactEmail = String(b.contactEmail || "").trim();
    if (b.tags !== undefined) patch.tags = toList(b.tags);

    if (b.isCurated !== undefined) patch.isCurated = !!b.isCurated;
    if (b.hasTickets !== undefined) patch.hasTickets = !!b.hasTickets;
    if (b.isPublished !== undefined) patch.isPublished = !!b.isPublished;

    if (patch.startAt && isNaN(patch.startAt.getTime())) {
      return res.status(400).json({ message: "startAt invalid" });
    }
    if (patch.endAt && isNaN(patch.endAt.getTime())) {
      return res.status(400).json({ message: "endAt invalid" });
    }

    const updated = await Event.findByIdAndUpdate(req.params.id, patch, {
      new: true,
      runValidators: true,
    });

    if (!updated) return res.status(404).json({ message: "Event not found" });

    if (updated.endAt && updated.startAt && updated.endAt < updated.startAt) {
      return res.status(400).json({ message: "endAt cannot be before startAt" });
    }

    return res.json(updated);
  } catch (err) {
    console.error("Update event error:", err);
    return res.status(500).json({ message: "Server error (update event)" });
  }
});

// Admin: unpublish event
// POST /api/events/:id/unpublish
router.post("/:id/unpublish", protect, async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ message: "Admin only" });

    const ev = await Event.findById(req.params.id);
    if (!ev) return res.status(404).json({ message: "Event not found" });

    ev.isPublished = false;
    ev.unpublishedAt = new Date();
    ev.unpublishedBy = req.user.id;
    ev.unpublishedReason = String(req.body?.reason || "Unpublished by admin").trim();
    await ev.save();

    return res.json({ message: "Event unpublished", event: ev });
  } catch (err) {
    console.error("Unpublish event error:", err);
    return res.status(500).json({ message: "Server error (unpublish event)" });
  }
});

// Admin: republish event
// POST /api/events/:id/republish
router.post("/:id/republish", protect, async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ message: "Admin only" });

    const ev = await Event.findById(req.params.id);
    if (!ev) return res.status(404).json({ message: "Event not found" });

    ev.isPublished = true;
    ev.unpublishedAt = null;
    ev.unpublishedBy = null;
    ev.unpublishedReason = "";
    await ev.save();

    return res.json({ message: "Event republished", event: ev });
  } catch (err) {
    console.error("Republish event error:", err);
    return res.status(500).json({ message: "Server error (republish event)" });
  }
});

module.exports = router;
