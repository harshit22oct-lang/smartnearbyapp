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

//
// ✅ SEARCH by city + optional text
// GET /api/search?city=bhopal&q=pizza
//
router.get("/", protect, async (req, res) => {
  const city = normCity(req.query.city);
  const q = String(req.query.q || "").trim();

  if (!city) return res.status(400).json({ message: "city is required" });

  try {
    const filter = { city };

    if (q) {
      const re = new RegExp(q, "i");
      filter.$or = [
        { name: { $regex: re } },
        { category: { $regex: re } },
        { location: { $regex: re } },
        { address: { $regex: re } },
        { vibe: { $regex: re } },
        { why: { $regex: re } },
        { highlight: { $regex: re } },
        { tags: { $in: [re] } },
        { activities: { $in: [re] } },
      ];
    }

    const results = await Business.find(filter).sort({ createdAt: -1 });
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

    // ✅ clean error instead of throwing CastError
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid business id" });
    }

    const business = await Business.findById(id);
    if (!business) return res.status(404).json({ message: "Business not found" });

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
      "imageUrl", // optional: old single image support
      "photoRef", // optional: old google photo ref support
      "placeId",  // optional
      "source",   // optional (if you want to change source)
    ];

    allow.forEach((k) => {
      if (req.body?.[k] !== undefined) b[k] = req.body[k];
    });

    // ✅ normalize important types
    if (req.body?.city !== undefined) b.city = normCity(req.body.city);
    if (req.body?.tags !== undefined) b.tags = toList(req.body.tags);
    if (req.body?.activities !== undefined) b.activities = toList(req.body.activities);
    if (req.body?.images !== undefined) b.images = toList(req.body.images);
    if (req.body?.rating !== undefined) b.rating = toNumOrNull(req.body.rating);
    if (req.body?.instagrammable !== undefined) b.instagrammable = !!req.body.instagrammable;

    // ✅ keep old imageUrl in sync if images updated and imageUrl empty
    if (req.body?.images !== undefined) {
      if (!b.imageUrl) b.imageUrl = (b.images && b.images[0]) || "";
    }

    await b.save();
    return res.json(b);
  } catch (e) {
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

      // ✅ keep old single image fields compatible
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
      createdBy: req.user.id,
    });

    return res.status(201).json(business);
  } catch (err) {
    console.error("❌ Add business error:", err.message);
    return res.status(500).json({ message: "Server error (add business)" });
  }
});

//
// ✅ DELETE curated business (ADMIN ONLY)
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

    await Business.findByIdAndDelete(id);
    return res.json({ message: "✅ Curated place deleted" });
  } catch (err) {
    console.error("❌ Delete business error:", err.message);
    return res.status(500).json({ message: "Server error (delete)" });
  }
});

module.exports = router;