const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const User = require("../models/User");

// ✅ Get favorites list
router.get("/", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate("favorites");
    res.json(user.favorites || []);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Toggle favorite (add/remove)
router.post("/:businessId", authMiddleware, async (req, res) => {
  try {
    const { businessId } = req.params;

    const user = await User.findById(req.user.id);
    const exists = user.favorites.some((id) => id.toString() === businessId);

    if (exists) {
      user.favorites = user.favorites.filter((id) => id.toString() !== businessId);
    } else {
      user.favorites.push(businessId);
    }

    await user.save();
    res.json({ message: exists ? "Removed from favorites" : "Added to favorites" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
