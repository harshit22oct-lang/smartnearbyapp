const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Business = require("../models/Business");
const protect = require("../middleware/authMiddleware");

// helpers
const normCity = (s) => String(s || "").trim().toLowerCase();

const toList = (v) =>
  Array.isArray(v)
    ? v.map((x) => String(x || "").trim()).filter(Boolean)
    : String(v || "")
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);

const toNumOrNull = (v) => {
  if (v === "" || v === undefined || v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const escapeRegex = (s) => String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

//
// ✅ SEARCH by city + optional text
// GET /api/search?city=bhopal&q=pizza&limit=80
//
// NOTE: keep protect if you want login required; otherwise remove protect.
router.get("/", protect, async (req, res) => {
  const city = normCity(req.query.city);
  const q = String(req.query.q || "").trim();
  const limit = Math.min(Math.max(Number(req.query.limit || 80), 1), 200);
  const includeUnpublished =
    !!req.user?.isAdmin && String(req.query.includeUnpublished || "").trim() === "1";

  if (!city) return res.status(400).json({ message: "city is required" });

  try {
    const filter = { city };
    if (!includeUnpublished) filter.isPublished = { $ne: false };

    if (q) {
      const re = new RegExp(escapeRegex(q), "i");

      filter.$or = [
        { name: { $regex: re } },
        { category: { $regex: re } },
        { location: { $regex: re } },
        { address: { $regex: re } },
        { vibe: { $regex: re } },
        { why: { $regex: re } },
        { highlight: { $regex: re } },

        // ✅ arrays of strings: regex works on elements
        { tags: { $regex: re } },
        { activities: { $regex: re } },
      ];
    }

    const results = await Business.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return res.json(results);
  } catch (err) {
    console.error("❌ Search error:", err.message);
    return res.status(500).json({ message: "Server error (search)" });
  }
});

//
// ✅ GET ONE business by ID
// GET /api/search/:id
//
router.get("/:id", protect, async (req, res) => {
  try {
    const id = String(req.params.id || "").trim();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid business id" });
    }

    const business = await Business.findById(id).lean();
    if (!business) return res.status(404).json({ message: "Business not found" });
    if (business.isPublished === false && !req.user?.isAdmin) {
      return res.status(404).json({ message: "Business not found" });
    }

    return res.json(business);
  } catch (err) {
    console.error("❌ Get by ID error:", err.message);
    return res.status(500).json({ message: "Server error (get by id)" });
  }
});

// ✅ Admin: PUT /api/search/:id  (edit curated place)
router.put("/:id", protect, async (req, res) => {
  try {
    if (!req.user?.isAdmin) return res.status(403).json({ message: "Admin only" });

    const id = String(req.params.id || "").trim();
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid business id" });
    }

    const b = await Business.findById(id);
    if (!b) return res.status(404).json({ message: "Place not found" });

    const allow = [
      "name",
      "category",
      "address",
      "location",
      "emoji",
      "vibe",
      "priceLevel",
      "bestTime",
      "instagrammable",
      "tags",
      "activities",
      "why",
      "highlight",
      "instagram",
      "images",
      "city",
      "rating",
      "imageUrl",
      "photoRef",
      "placeId",
      "source",
      "isPublished",
      "unpublishedReason",
    ];

    allow.forEach((k) => {
      if (req.body?.[k] !== undefined) b[k] = req.body[k];
    });

    if (req.body?.city !== undefined) b.city = normCity(req.body.city);
    if (req.body?.tags !== undefined) b.tags = toList(req.body.tags);
    if (req.body?.activities !== undefined) b.activities = toList(req.body.activities);
    if (req.body?.images !== undefined) b.images = toList(req.body.images);
    if (req.body?.rating !== undefined) b.rating = toNumOrNull(req.body.rating);
    if (req.body?.instagrammable !== undefined) b.instagrammable = !!req.body.instagrammable;

    // keep old imageUrl in sync if images updated and imageUrl empty
    if (req.body?.images !== undefined) {
      if (!b.imageUrl) b.imageUrl = (b.images && b.images[0]) || "";
    }

    await b.save();
    return res.json(b);
  } catch (e) {
    // ✅ friendly unique index error (placeId already exists)
    if (e?.code === 11000) {
      return res.status(400).json({ message: "Duplicate placeId already exists" });
    }

    console.error("❌ Update place error:", e);
    return res.status(500).json({ message: "Failed to update place" });
  }
});

//
// ✅ ADD curated business (ADMIN ONLY)
// POST /api/search
//
router.post("/", protect, async (req, res) => {
  try {
    if (!req.user?.isAdmin) {
      return res
        .status(403)
        .json({ message: "Admin only: you cannot add curated businesses" });
    }

    const {
      city,
      name,
      category = "",
      location = "",
      address = "",
      rating = null,

      imageUrl = "",
      photoRef = "",
      images = [],

      emoji = "✨",
      vibe = "",
      priceLevel = "",
      bestTime = "",
      highlight = "",
      why = "",
      tags = [],
      activities = [],
      instagrammable = false,

      instagram = "",
      placeId = "",
      source = "mongo",
    } = req.body;

    const cleanCity = normCity(city);
    if (!cleanCity) return res.status(400).json({ message: "City is required" });

    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: "Name required" });
    }

    const cleanTags = toList(tags);
    const cleanActivities = toList(activities);
    const cleanImages = toList(images);

    const firstImage = cleanImages[0] || "";

    const business = await Business.create({
      city: cleanCity,

      name: String(name).trim(),
      category: String(category || "").trim(),
      location: String(location || "").trim(),
      address: String(address || "").trim(),
      rating: toNumOrNull(rating),

      imageUrl: String(imageUrl || "").trim() || firstImage,
      photoRef: String(photoRef || "").trim(),
      images: cleanImages,

      placeId: String(placeId || "").trim(),
      source: String(source || "mongo").trim(),

      emoji: String(emoji || "✨").trim(),
      vibe: String(vibe || "").trim(),
      priceLevel: String(priceLevel || "").trim(),
      bestTime: String(bestTime || "").trim(),
      highlight: String(highlight || "").trim(),
      why: String(why || "").trim(),
      tags: cleanTags,
      activities: cleanActivities,
      instagrammable: Boolean(instagrammable),

      instagram: String(instagram || "").trim(),

      curated: true,
      isPublished: true,
      createdBy: req.user.id,
    });

    return res.status(201).json(business);
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(400).json({ message: "Duplicate placeId already exists" });
    }
    console.error("❌ Add business error:", err.message);
    return res.status(500).json({ message: "Server error (add business)" });
  }
});

//
// ✅ DELETE curated business (ADMIN ONLY) -> soft-delete (unpublish)
// DELETE /api/search/:id
//
router.delete("/:id", protect, async (req, res) => {
  try {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ message: "Admin only: cannot delete" });
    }

    const id = String(req.params.id || "").trim();
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid business id" });
    }

    const business = await Business.findById(id);
    if (!business) return res.status(404).json({ message: "Business not found" });

    business.isPublished = false;
    business.unpublishedAt = new Date();
    business.unpublishedBy = req.user.id;
    business.unpublishedReason = String(req.body?.reason || "Deleted by admin").trim();
    await business.save();

    return res.json({ message: "Place unpublished" });
  } catch (err) {
    console.error("❌ Delete business error:", err.message);
    return res.status(500).json({ message: "Server error (delete)" });
  }
});

// ✅ Admin: explicit unpublish
// POST /api/search/:id/unpublish
router.post("/:id/unpublish", protect, async (req, res) => {
  try {
    if (!req.user?.isAdmin) return res.status(403).json({ message: "Admin only" });

    const id = String(req.params.id || "").trim();
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid business id" });
    }

    const business = await Business.findById(id);
    if (!business) return res.status(404).json({ message: "Business not found" });

    business.isPublished = false;
    business.unpublishedAt = new Date();
    business.unpublishedBy = req.user.id;
    business.unpublishedReason = String(req.body?.reason || "Unpublished by admin").trim();
    await business.save();

    return res.json({ message: "Place unpublished", business });
  } catch (err) {
    console.error("❌ Unpublish business error:", err.message);
    return res.status(500).json({ message: "Server error (unpublish)" });
  }
});

// ✅ Admin: republish
// POST /api/search/:id/republish
router.post("/:id/republish", protect, async (req, res) => {
  try {
    if (!req.user?.isAdmin) return res.status(403).json({ message: "Admin only" });

    const id = String(req.params.id || "").trim();
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid business id" });
    }

    const business = await Business.findById(id);
    if (!business) return res.status(404).json({ message: "Business not found" });

    business.isPublished = true;
    business.unpublishedAt = null;
    business.unpublishedBy = null;
    business.unpublishedReason = "";
    await business.save();

    return res.json({ message: "Place republished", business });
  } catch (err) {
    console.error("❌ Republish business error:", err.message);
    return res.status(500).json({ message: "Server error (republish)" });
  }
});

// ✅ User: remove own approved submission place directly
// POST /api/search/:id/remove-mine
router.post("/:id/remove-mine", protect, async (req, res) => {
  try {
    const id = String(req.params.id || "").trim();
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid business id" });
    }

    const business = await Business.findById(id);
    if (!business) return res.status(404).json({ message: "Business not found" });

    if (String(business.submittedBy || "") !== String(req.user.id)) {
      return res.status(403).json({ message: "Not allowed" });
    }

    business.isPublished = false;
    business.unpublishedAt = new Date();
    business.unpublishedBy = req.user.id;
    business.unpublishedReason = "Removed by owner";
    await business.save();

    return res.json({ message: "Place removed" });
  } catch (err) {
    console.error("❌ Remove own business error:", err.message);
    return res.status(500).json({ message: "Server error (remove own business)" });
  }
});

module.exports = router;
