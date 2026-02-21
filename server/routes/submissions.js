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

const isAdmin = (req) => !!req.user?.isAdmin;

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

    // ✅ prevent spam duplicates (same user, same city, same name, still pending)
    const existing = await PendingPlace.findOne({
      submittedBy: req.user.id,
      city: payload.city,
      name: payload.name,
      status: "pending",
    }).select("_id");

    if (existing) {
      return res
        .status(400)
        .json({ message: "You already submitted this place (pending)" });
    }

    const created = await PendingPlace.create(payload);
    return res.status(201).json(created);
  } catch (err) {
    console.error("Create submission error:", err);
    return res.status(500).json({ message: "Server error (create submission)" });
  }
});

/**
 * ✅ KEEP THESE BEFORE "/:id"
 */

// ✅ GET /api/submissions/mine (user)
router.get("/mine", protect, async (req, res) => {
  try {
    const list = await PendingPlace.find({ submittedBy: req.user.id })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    return res.json(list);
  } catch (e) {
    console.error("Load my submissions error:", e);
    return res.status(500).json({ message: "Failed to load my submissions" });
  }
});

// ✅ Admin: list submissions by status
// GET /api/submissions?status=pending
router.get("/", protect, async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ message: "Admin only" });

    const status = String(req.query.status || "pending").trim();

    const list = await PendingPlace.find({ status })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    return res.json(list);
  } catch (err) {
    console.error("List submissions error:", err);
    return res.status(500).json({ message: "Server error (list submissions)" });
  }
});

// ✅ Admin: GET /api/submissions/:id (view full pending details)
router.get("/:id", protect, async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ message: "Admin only" });

    const s = await PendingPlace.findById(req.params.id).lean();
    if (!s) return res.status(404).json({ message: "Submission not found" });

    return res.json(s);
  } catch (e) {
    console.error("Load submission error:", e);
    return res.status(500).json({ message: "Failed to load submission" });
  }
});

// ✅ Admin: PUT /api/submissions/:id (edit pending before approve)
router.put("/:id", protect, async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ message: "Admin only" });

    const s = await PendingPlace.findById(req.params.id);
    if (!s) return res.status(404).json({ message: "Submission not found" });

    // ✅ status rules
    if (req.body?.status !== undefined) {
      const st = String(req.body.status || "").trim();
      if (st === "approved") {
        return res.status(400).json({ message: "Use /approve endpoint to approve" });
      }
      // allow only pending/rejected here
      if (["pending", "rejected"].includes(st)) s.status = st;
    }

    // ✅ editable fields
    const allow = [
      "name",
      "city",
      "category",
      "address",
      "location",
      "emoji",
      "vibe",
      "priceLevel",
      "bestTime",
      "instagrammable",
      "images",
      "instagram",
      "tags",
      "activities",
      "highlight",
      "why",
    ];

    allow.forEach((k) => {
      if (req.body?.[k] !== undefined) s[k] = req.body[k];
    });

    // ✅ normalize fields
    if (req.body?.city !== undefined) s.city = normCity(req.body.city);
    if (req.body?.tags !== undefined) s.tags = toList(req.body.tags);
    if (req.body?.activities !== undefined) s.activities = toList(req.body.activities);
    if (req.body?.images !== undefined) s.images = toList(req.body.images);

    await s.save();
    return res.json(s);
  } catch (e) {
    console.error("Update submission error:", e);
    return res.status(500).json({ message: "Failed to update submission" });
  }
});

// ✅ Admin: approve -> create Business curated place
// POST /api/submissions/:id/approve
router.post("/:id/approve", protect, async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ message: "Admin only" });

    const sub = await PendingPlace.findById(req.params.id);
    if (!sub) return res.status(404).json({ message: "Submission not found" });
    if (sub.status !== "pending") return res.status(400).json({ message: "Already processed" });

    const images = Array.isArray(sub.images) ? sub.images.filter(Boolean) : [];
    const firstImage = images[0] || "";

    const business = await Business.create({
      city: sub.city,
      curated: true,
      source: "user_submission",

      name: sub.name,
      category: sub.category,
      address: sub.address,
      location: sub.location,

      rating: null,

      imageUrl: firstImage,
      photoRef: "",

      images,

      placeId: "",

      instagram: sub.instagram || "",

      tags: sub.tags || [],
      activities: sub.activities || [],
      highlight: sub.highlight || "",
      why: sub.why || "",

      emoji: sub.emoji || "✨",
      vibe: sub.vibe || "",
      priceLevel: sub.priceLevel || "",
      bestTime: sub.bestTime || "",
      instagrammable: !!sub.instagrammable,

      createdBy: req.user?.id || null,
    });

    sub.status = "approved";
    sub.reviewedBy = req.user.id;
    sub.reviewedAt = new Date();
    await sub.save();

    return res.json({ message: "Approved", business });
  } catch (err) {
    console.error("Approve submission error:", err);
    return res.status(500).json({ message: "Server error (approve submission)" });
  }
});

// ✅ Admin: reject
// POST /api/submissions/:id/reject   { reason? }
router.post("/:id/reject", protect, async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ message: "Admin only" });

    const sub = await PendingPlace.findById(req.params.id);
    if (!sub) return res.status(404).json({ message: "Submission not found" });

    sub.status = "rejected";
    sub.reviewedBy = req.user.id;
    sub.reviewedAt = new Date();
    sub.rejectionReason = String(req.body?.reason || "").trim();
    await sub.save();

    return res.json({ message: "Rejected" });
  } catch (err) {
    console.error("Reject submission error:", err);
    return res.status(500).json({ message: "Server error (reject submission)" });
  }
});

module.exports = router;