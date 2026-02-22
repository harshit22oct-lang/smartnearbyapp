const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const protect = require("../middleware/authMiddleware");

const Business = require("../models/Business");
const Event = require("../models/Event");

const isAdmin = (req) => !!req.user?.isAdmin;
const normCity = (s) => String(s || "").trim().toLowerCase();

// GET /api/admin/content?type=all|places|events&q=...&city=...
router.get("/", protect, async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ message: "Admin only" });

    const type = String(req.query.type || "all").trim().toLowerCase();
    const q = String(req.query.q || "").trim();
    const city = normCity(req.query.city);
    const limit = Math.min(Math.max(Number(req.query.limit || 200), 1), 400);

    const queryParts = q
      ? [
          { title: { $regex: q, $options: "i" } },
          { name: { $regex: q, $options: "i" } },
          { category: { $regex: q, $options: "i" } },
          { venue: { $regex: q, $options: "i" } },
          { address: { $regex: q, $options: "i" } },
        ]
      : [];

    let places = [];
    let events = [];

    if (type === "all" || type === "places") {
      const pf = {};
      if (city) pf.city = city;
      if (queryParts.length) {
        pf.$or = queryParts.filter((x) => x.name || x.category || x.address);
      }

      places = await Business.find(pf)
        .select(
          "_id city name category address imageUrl images source createdAt isPublished unpublishedAt submittedBy sourceSubmission"
        )
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
    }

    if (type === "all" || type === "events") {
      const ef = {};
      if (city) ef.city = city;
      if (queryParts.length) {
        ef.$or = queryParts.filter((x) => x.title || x.category || x.venue || x.address);
      }

      events = await Event.find(ef)
        .select("_id city title category venue address startAt bannerImage createdAt isPublished unpublishedAt")
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
    }

    return res.json({
      places,
      events,
      counts: { places: places.length, events: events.length },
    });
  } catch (err) {
    console.error("Admin content list error:", err);
    return res.status(500).json({ message: "Server error (admin content list)" });
  }
});

// POST /api/admin/content/place/:id/unpublish
router.post("/place/:id/unpublish", protect, async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ message: "Admin only" });
    const id = String(req.params.id || "").trim();
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid id" });

    const b = await Business.findById(id);
    if (!b) return res.status(404).json({ message: "Place not found" });

    b.isPublished = false;
    b.unpublishedAt = new Date();
    b.unpublishedBy = req.user.id;
    b.unpublishedReason = String(req.body?.reason || "Unpublished by admin").trim();
    await b.save();

    return res.json({ message: "Place unpublished", item: b });
  } catch (err) {
    console.error("Admin place unpublish error:", err);
    return res.status(500).json({ message: "Server error (place unpublish)" });
  }
});

// POST /api/admin/content/place/:id/republish
router.post("/place/:id/republish", protect, async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ message: "Admin only" });
    const id = String(req.params.id || "").trim();
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid id" });

    const b = await Business.findById(id);
    if (!b) return res.status(404).json({ message: "Place not found" });

    b.isPublished = true;
    b.unpublishedAt = null;
    b.unpublishedBy = null;
    b.unpublishedReason = "";
    await b.save();

    return res.json({ message: "Place republished", item: b });
  } catch (err) {
    console.error("Admin place republish error:", err);
    return res.status(500).json({ message: "Server error (place republish)" });
  }
});

// POST /api/admin/content/event/:id/unpublish
router.post("/event/:id/unpublish", protect, async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ message: "Admin only" });
    const id = String(req.params.id || "").trim();
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid id" });

    const ev = await Event.findById(id);
    if (!ev) return res.status(404).json({ message: "Event not found" });

    ev.isPublished = false;
    ev.unpublishedAt = new Date();
    ev.unpublishedBy = req.user.id;
    ev.unpublishedReason = String(req.body?.reason || "Unpublished by admin").trim();
    await ev.save();

    return res.json({ message: "Event unpublished", item: ev });
  } catch (err) {
    console.error("Admin event unpublish error:", err);
    return res.status(500).json({ message: "Server error (event unpublish)" });
  }
});

// POST /api/admin/content/event/:id/republish
router.post("/event/:id/republish", protect, async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ message: "Admin only" });
    const id = String(req.params.id || "").trim();
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid id" });

    const ev = await Event.findById(id);
    if (!ev) return res.status(404).json({ message: "Event not found" });

    ev.isPublished = true;
    ev.unpublishedAt = null;
    ev.unpublishedBy = null;
    ev.unpublishedReason = "";
    await ev.save();

    return res.json({ message: "Event republished", item: ev });
  } catch (err) {
    console.error("Admin event republish error:", err);
    return res.status(500).json({ message: "Server error (event republish)" });
  }
});

module.exports = router;
