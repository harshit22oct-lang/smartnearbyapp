const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const authMiddleware = require("../middleware/authMiddleware");
const User = require("../models/User");
const Business = require("../models/Business");

// ✅ Get favorites list
// GET /api/favorites
router.get("/", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate("favorites").lean();
    if (!user) return res.status(404).json({ message: "User not found" });

    return res.json(user.favorites || []);
  } catch (err) {
    console.error("Favorites list error:", err);
    return res.status(500).json({ message: "Server error (favorites list)" });
  }
});

// ✅ Toggle favorite (add/remove) - atomic & no duplicates
// POST /api/favorites/:businessId
router.post("/:businessId", authMiddleware, async (req, res) => {
  try {
    const businessId = String(req.params.businessId || "").trim();

    if (!mongoose.Types.ObjectId.isValid(businessId)) {
      return res.status(400).json({ message: "Invalid business id" });
    }

    // optional but good: ensure business exists
    const existsBiz = await Business.findById(businessId).select("_id").lean();
    if (!existsBiz) return res.status(404).json({ message: "Business not found" });

    const user = await User.findById(req.user.id).select("favorites");
    if (!user) return res.status(404).json({ message: "User not found" });

    const already = (user.favorites || []).some((id) => String(id) === businessId);

    if (already) {
      await User.updateOne({ _id: req.user.id }, { $pull: { favorites: businessId } });
      return res.json({ message: "Removed from favorites", isFavorite: false });
    } else {
      await User.updateOne({ _id: req.user.id }, { $addToSet: { favorites: businessId } });
      return res.json({ message: "Added to favorites", isFavorite: true });
    }
  } catch (err) {
    console.error("Toggle favorite error:", err);
    return res.status(500).json({ message: "Server error (favorite toggle)" });
  }
});

module.exports = router;