const express = require("express");
const router = express.Router();
const Business = require("../models/Business");
const protect = require("../middleware/authMiddleware");

// small helper (same behavior everywhere)
const normCity = (s) => String(s || "").trim().toLowerCase();

//
// ✅ SEARCH by city + optional text
// GET /api/search?city=bhopal&q=pizza
//
router.get("/", protect, async (req, res) => {
  const city = normCity(req.query.city);
  const query = String(req.query.q || "").trim();

  // ✅ city required so curated results never mix across cities
  if (!city) return res.status(400).json({ message: "city is required" });

  try {
    const filter = { city };

    // Optional keyword filter
    if (query) {
      const re = new RegExp(query, "i");
      filter.$or = [
        { name: { $regex: re } },
        { category: { $regex: re } },
        { location: { $regex: re } },
        { address: { $regex: re } },

        // curated fields searchable too
        { vibe: { $regex: re } },
        { why: { $regex: re } },
        { highlight: { $regex: re } },
        { tags: { $in: [re] } },
        { activities: { $in: [re] } },
      ];
    }

    const results = await Business.find(filter).sort({ createdAt: -1 });
    res.json(results);
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({ message: "Server error (search)" });
  }
});

//
// ✅ GET ONE business by ID
// GET /api/search/:id
//
router.get("/:id", protect, async (req, res) => {
  try {
    const business = await Business.findById(req.params.id);
    if (!business) return res.status(404).json({ message: "Business not found" });
    res.json(business);
  } catch (err) {
    console.error("Get by ID error:", err);
    res.status(500).json({ message: "Server error (get by id)" });
  }
});

//
// ✅ ADD curated business (ADMIN ONLY)
// POST /api/search
//
router.post("/", protect, async (req, res) => {
  try {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ message: "Admin only: you cannot add curated businesses" });
    }

    const {
      // ✅ REQUIRED
      city,

      // base
      name,
      category = "",
      location = "",
      address = "",
      rating = null,

      // old single-image support (still allowed)
      imageUrl = "",
      photoRef = "",

      // ✅ NEW: multiple images (uploaded or URLs)
      images = [],

      // curated “taste”
      emoji = "✨",
      vibe = "",
      priceLevel = "",
      bestTime = "",
      highlight = "",
      why = "",
      tags = [],
      activities = [],
      instagrammable = false,
    } = req.body;

    const cleanCity = normCity(city);
    if (!cleanCity) return res.status(400).json({ message: "City is required" });

    if (!name || !name.trim()) return res.status(400).json({ message: "Name required" });

    const cleanTags = Array.isArray(tags)
      ? tags.map((t) => String(t).trim()).filter(Boolean)
      : [];

    const cleanActivities = Array.isArray(activities)
      ? activities.map((a) => String(a).trim()).filter(Boolean)
      : [];

    const cleanImages = Array.isArray(images)
      ? images.map((u) => String(u).trim()).filter(Boolean)
      : [];

    const business = await Business.create({
      city: cleanCity,

      name: name.trim(),
      category: String(category || "").trim(),
      location: String(location || "").trim(),
      address: String(address || "").trim(),
      rating: rating === "" || rating === undefined || rating === null ? null : Number(rating),

      imageUrl: String(imageUrl || "").trim(),
      photoRef: String(photoRef || "").trim(),

      // ✅ store gallery
      images: cleanImages,

      emoji: String(emoji || "✨").trim(),
      vibe: String(vibe || "").trim(),
      priceLevel: String(priceLevel || "").trim(),
      bestTime: String(bestTime || "").trim(),
      highlight: String(highlight || "").trim(),
      why: String(why || "").trim(),
      tags: cleanTags,
      activities: cleanActivities,
      instagrammable: Boolean(instagrammable),

      curated: true,
      createdBy: req.user.id,
    });

    res.status(201).json(business);
  } catch (err) {
    console.error("Add business error:", err);
    res.status(500).json({ message: "Server error (add business)" });
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

    const business = await Business.findById(req.params.id);
    if (!business) return res.status(404).json({ message: "Business not found" });

    await Business.findByIdAndDelete(req.params.id);
    res.json({ message: "✅ Curated place deleted" });
  } catch (err) {
    console.error("Delete business error:", err);
    res.status(500).json({ message: "Server error (delete)" });
  }
});

module.exports = router;
