const express = require("express");
const router = express.Router();

const { register, login } = require("../controllers/authController");
const protect = require("../middleware/authMiddleware");
const User = require("../models/User");


// =============================
// REGISTER + LOGIN
// =============================

router.post("/register", register);
router.post("/login", login);


// =============================
// PROFILE (VERY IMPORTANT)
// =============================
// This returns full user with isAdmin

router.get("/profile", protect, async (req, res) => {
  try {
    // req.user already comes from middleware
    const user = await User.findById(req.user._id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);

  } catch (err) {
    console.error("Profile error:", err);
    res.status(500).json({ message: "Server error" });
  }
});


module.exports = router;
