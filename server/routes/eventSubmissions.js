const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");

const PendingEvent = require("../models/PendingEvent");
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

router.post("/", protect, async (req, res) => {
  try {
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
      website: String(b.website || "").trim(),
      instagram: String(b.instagram || "").trim(),
      contactPhone: String(b.contactPhone || "").trim(),
      contactEmail: String(b.contactEmail || "").trim(),
      tags: toList(b.tags),
      hasTickets: !!b.hasTickets,
      submittedBy: req.user?.id || null,
      status: "pending",
    };

    if (!payload.title) return res.status(400).json({ message: "title required" });
    if (!payload.city) return res.status(400).json({ message: "city required" });
    if (!payload.startAt || isNaN(payload.startAt.getTime())) {
      return res.status(400).json({ message: "startAt required" });
    }
    if (payload.endAt && payload.endAt < payload.startAt) {
      return res.status(400).json({ message: "endAt cannot be before startAt" });
    }

    const existing = await PendingEvent.findOne({
      submittedBy: req.user.id,
      city: payload.city,
      title: payload.title,
      status: "pending",
    }).select("_id");

    if (existing) {
      return res.status(400).json({ message: "You already submitted this event (pending)" });
    }

    const created = await PendingEvent.create(payload);
    return res.status(201).json(created);
  } catch (err) {
    console.error("Create event submission error:", err);
    return res.status(500).json({ message: "Server error (create event submission)" });
  }
});

router.get("/mine", protect, async (req, res) => {
  try {
    const list = await PendingEvent.find({ submittedBy: req.user.id })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
    return res.json(list);
  } catch (err) {
    console.error("Load my event submissions error:", err);
    return res.status(500).json({ message: "Failed to load my event submissions" });
  }
});

router.get("/", protect, async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ message: "Admin only" });

    const status = String(req.query.status || "pending").trim();
    const list = await PendingEvent.find({ status })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    return res.json(list);
  } catch (err) {
    console.error("List event submissions error:", err);
    return res.status(500).json({ message: "Server error (list event submissions)" });
  }
});

router.get("/:id", protect, async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ message: "Admin only" });

    const s = await PendingEvent.findById(req.params.id).lean();
    if (!s) return res.status(404).json({ message: "Submission not found" });

    return res.json(s);
  } catch (err) {
    console.error("Load event submission error:", err);
    return res.status(500).json({ message: "Failed to load event submission" });
  }
});

router.put("/:id", protect, async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ message: "Admin only" });

    const s = await PendingEvent.findById(req.params.id);
    if (!s) return res.status(404).json({ message: "Submission not found" });

    const allow = [
      "title",
      "city",
      "category",
      "venue",
      "address",
      "description",
      "organizer",
      "startAt",
      "endAt",
      "bannerImage",
      "images",
      "price",
      "capacity",
      "website",
      "instagram",
      "contactPhone",
      "contactEmail",
      "tags",
      "hasTickets",
      "status",
    ];

    allow.forEach((k) => {
      if (req.body?.[k] !== undefined) s[k] = req.body[k];
    });

    if (req.body?.city !== undefined) s.city = normCity(req.body.city);
    if (req.body?.tags !== undefined) s.tags = toList(req.body.tags);
    if (req.body?.images !== undefined) s.images = toList(req.body.images);

    await s.save();
    return res.json(s);
  } catch (err) {
    console.error("Update event submission error:", err);
    return res.status(500).json({ message: "Failed to update event submission" });
  }
});

router.post("/:id/approve", protect, async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ message: "Admin only" });

    const sub = await PendingEvent.findById(req.params.id);
    if (!sub) return res.status(404).json({ message: "Submission not found" });
    if (sub.status !== "pending") return res.status(400).json({ message: "Already processed" });

    const images = Array.isArray(sub.images) ? sub.images.filter(Boolean) : [];
    const banner = sub.bannerImage || images[0] || "";

    const event = await Event.create({
      title: sub.title,
      city: sub.city,
      category: sub.category,
      venue: sub.venue,
      address: sub.address,
      description: sub.description,
      organizer: sub.organizer,
      startAt: sub.startAt,
      endAt: sub.endAt || null,
      bannerImage: banner,
      images,
      price: Number(sub.price || 0),
      capacity: Number(sub.capacity || 200),
      ticketsSold: 0,
      status: "upcoming",
      website: sub.website || "",
      instagram: sub.instagram || "",
      contactPhone: sub.contactPhone || "",
      contactEmail: sub.contactEmail || "",
      tags: sub.tags || [],
      isCurated: true,
      hasTickets: !!sub.hasTickets,
      createdBy: req.user?.id || null,
    });

    sub.status = "approved";
    sub.reviewedBy = req.user.id;
    sub.reviewedAt = new Date();
    await sub.save();

    return res.json({ message: "Approved", event });
  } catch (err) {
    console.error("Approve event submission error:", err);
    return res.status(500).json({ message: "Server error (approve event submission)" });
  }
});

router.post("/:id/reject", protect, async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ message: "Admin only" });

    const sub = await PendingEvent.findById(req.params.id);
    if (!sub) return res.status(404).json({ message: "Submission not found" });

    sub.status = "rejected";
    sub.reviewedBy = req.user.id;
    sub.reviewedAt = new Date();
    sub.rejectionReason = String(req.body?.reason || "").trim();
    await sub.save();

    return res.json({ message: "Rejected" });
  } catch (err) {
    console.error("Reject event submission error:", err);
    return res.status(500).json({ message: "Server error (reject event submission)" });
  }
});

module.exports = router;
