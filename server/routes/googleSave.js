const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const Business = require("../models/Business");
const User = require("../models/User");

const normCity = (s) => String(s || "").trim().toLowerCase();
const toStr = (v) => String(v || "").trim();

const toNumOrNull = (v) => {
  if (v === "" || v === undefined || v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

// ✅ Save Google Place: import if needed → then favorite
// POST /api/google-actions/save
router.post("/save", protect, async (req, res) => {
  try {
    const b = req.body || {};

    const placeId = toStr(b.placeId);
    const name = toStr(b.name);
    const city = normCity(b.city);

    if (!placeId || !name) {
      return res.status(400).json({ message: "placeId and name are required" });
    }
    if (!city) {
      return res.status(400).json({ message: "city is required" });
    }

    const address = toStr(b.address);
    const photoRef = toStr(b.photoRef);
    const imageUrl = toStr(b.imageUrl);
    const rating = toNumOrNull(b.rating);

    // 1) Find existing business by placeId
    let business = await Business.findOne({ placeId });

    // 2) If not exists, create it (Google sourced)
    if (!business) {
      try {
        business = await Business.create({
          city,
          placeId,
          source: "google",
          curated: false,

          name,
          address,
          rating,

          photoRef,
          imageUrl,
          images: imageUrl ? [imageUrl] : [],

          category: "",
          location: "",

          createdBy: req.user?.id || null,
        });
      } catch (e) {
        // ✅ handle race-condition: another request created it
        if (e?.code === 11000) {
          business = await Business.findOne({ placeId });
        } else {
          throw e;
        }
      }
    } else {
      // ✅ patch missing fields (keeps data improving over time)
      let changed = false;

      if (!business.city) {
        business.city = city;
        changed = true;
      }
      if (!business.address && address) {
        business.address = address;
        changed = true;
      }
      if ((business.rating === null || business.rating === undefined) && rating !== null) {
        business.rating = rating;
        changed = true;
      }
      if (!business.photoRef && photoRef) {
        business.photoRef = photoRef;
        changed = true;
      }
      if (!business.imageUrl && imageUrl) {
        business.imageUrl = imageUrl;
        changed = true;
      }
      if ((business.images || []).length === 0 && imageUrl) {
        business.images = [imageUrl];
        changed = true;
      }
      if (!business.source) {
        business.source = "google";
        changed = true;
      }

      if (changed) await business.save();
    }

    if (!business?._id) {
      return res.status(500).json({ message: "Failed to import business" });
    }

    // 3) Add to favorites atomically (no duplicates)
    await User.updateOne(
      { _id: req.user.id },
      { $addToSet: { favorites: business._id } }
    );

    return res.json({
      message: "✅ Saved Google place",
      businessId: business._id,
      isFavorite: true,
    });
  } catch (err) {
    console.error("Google save error:", err);
    return res.status(500).json({ message: "Server error (google save)" });
  }
});

// ✅ Unsave Google Place → remove from favorites
// POST /api/google-actions/unsave
router.post("/unsave", protect, async (req, res) => {
  try {
    const placeId = toStr(req.body?.placeId);

    if (!placeId) return res.status(400).json({ message: "placeId required" });

    const business = await Business.findOne({ placeId }).select("_id");
    if (!business) {
      return res.json({ message: "Already unsaved", isFavorite: false });
    }

    await User.updateOne(
      { _id: req.user.id },
      { $pull: { favorites: business._id } }
    );

    return res.json({
      message: "Removed from favorites",
      businessId: business._id,
      isFavorite: false,
    });
  } catch (err) {
    console.error("Google unsave error:", err);
    return res.status(500).json({ message: "Server error (google unsave)" });
  }
});

module.exports = router;