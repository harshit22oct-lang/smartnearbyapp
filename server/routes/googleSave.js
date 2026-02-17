const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const Business = require("../models/Business");
const User = require("../models/User");

// ✅ Save Google Place (1 click): import if needed → then favorite
// POST /api/google/save
router.post("/save", protect, async (req, res) => {
  try {
    const { placeId, name, address, rating, photoRef, imageUrl } = req.body;

    if (!placeId || !name) {
      return res.status(400).json({ message: "placeId and name are required" });
    }

    // 1) If already imported, use it
    let business = await Business.findOne({ placeId });

    // 2) If not imported, create Mongo business
    if (!business) {
      business = await Business.create({
        placeId,
        name,
        address: address || "",
        rating: rating === "" || rating === undefined ? null : Number(rating),
        photoRef: photoRef || "",
        imageUrl: imageUrl || "",
        curated: false, // because it's from Google
      });
    }

    // 3) Add to user favorites
    const user = await User.findById(req.user.id);
    if (!user.favorites) user.favorites = [];

    const exists = user.favorites.some((id) => String(id) === String(business._id));

    if (!exists) {
      user.favorites.push(business._id);
      await user.save();
    }

    return res.json({ message: "✅ Saved Google place", businessId: business._id });
  } catch (err) {
    console.error("Google save error:", err);
    return res.status(500).json({ message: "Server error (google save)" });
  }
});

module.exports = router;
