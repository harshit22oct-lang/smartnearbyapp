const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");

const PendingPlace = require("../models/PendingPlace");
const Business = require("../models/Business");

const normCity = (s) => String(s || "").trim().toLowerCase();

const toList = (v) =>
  Array.isArray(v)
    ? v.map((x) => String(x || "").trim()).filter(Boolean)
    : String(v || "")
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);

// ✅ User submits a place (PENDING)
// POST /api/submissions
router.post("/", protect, async (req, res) => {
  try {
    const body = req.body || {};

    const payload = {
      name: String(body.name || "").trim(),
      city: normCity(body.city),
      category: String(body.category || "").trim(),
      address: String(body.address || "").trim(),

      location: String(body.location || "").trim(),
      emoji: String(body.emoji || "✨").trim(),
      vibe: String(body.vibe || "").trim(),
      priceLevel: String(body.priceLevel || "").trim(),
      bestTime: String(body.bestTime || "").trim(),
      instagrammable: !!body.instagrammable,

      images: toList(body.images),
      instagram: String(body.instagram || "").trim(),
      tags: toList(body.tags),
      activities: toList(body.activities),
      highlight: String(body.highlight || "").trim(),
      why: String(body.why || "").trim(),

      submittedBy: req.user?.id || null,
      status: "pending",
    };

    if (!payload.name) return res.status(400).json({ message: "name is required" });
    if (!payload.city) return res.status(400).json({ message: "city is required" });

    const created = await PendingPlace.create(payload);
    return res.status(201).json(created);
  } catch (err) {
    console.error("Create submission error:", err);
    return res.status(500).json({ message: "Server error (create submission)" });
  }
});

// ✅ Admin: list pending submissions
// GET /api/submissions?status=pending
router.get("/", protect, async (req, res) => {
  try {
    if (!req.user?.isAdmin) return res.status(403).json({ message: "Admin only" });

    const status = String(req.query.status || "pending");
    const list = await PendingPlace.find({ status }).sort({ createdAt: -1 }).limit(100);
    return res.json(list);
  } catch (err) {
    console.error("List submissions error:", err);
    return res.status(500).json({ message: "Server error (list submissions)" });
  }
});

// ✅ Admin: approve -> create Business curated place
// POST /api/submissions/:id/approve
router.post("/:id/approve", protect, async (req, res) => {
  try {
    if (!req.user?.isAdmin) return res.status(403).json({ message: "Admin only" });

    const sub = await PendingPlace.findById(req.params.id);
    if (!sub) return res.status(404).json({ message: "Submission not found" });
    if (sub.status !== "pending") return res.status(400).json({ message: "Already processed" });

    const business = await Business.create({
      city: sub.city,
      curated: true,
      source: "user_submission",

      name: sub.name,
      category: sub.category,
      address: sub.address,
      location: sub.location,

      images: sub.images || [],
      instagram: sub.instagram,

      tags: sub.tags || [],
      activities: sub.activities || [],
      highlight: sub.highlight,
      why: sub.why,

      emoji: sub.emoji || "✨",
      vibe: sub.vibe || "",
      priceLevel: sub.priceLevel || "",
      bestTime: sub.bestTime || "",
      instagrammable: !!sub.instagrammable,

      createdBy: req.user?.id || null,
    });

    sub.status = "approved";
    await sub.save();

    return res.json({ message: "Approved", business });
  } catch (err) {
    console.error("Approve submission error:", err);
    return res.status(500).json({ message: "Server error (approve submission)" });
  }
});

// ✅ Admin: reject
// POST /api/submissions/:id/reject
router.post("/:id/reject", protect, async (req, res) => {
  try {
    if (!req.user?.isAdmin) return res.status(403).json({ message: "Admin only" });

    const sub = await PendingPlace.findById(req.params.id);
    if (!sub) return res.status(404).json({ message: "Submission not found" });

    sub.status = "rejected";
    await sub.save();

    return res.json({ message: "Rejected" });
  } catch (err) {
    console.error("Reject submission error:", err);
    return res.status(500).json({ message: "Server error (reject submission)" });
  }
});

module.exports = router;