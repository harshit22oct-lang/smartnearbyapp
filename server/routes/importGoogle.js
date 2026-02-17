const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const Business = require("../models/Business");

// helper: normalize city like your schema expects
const normCity = (s) => String(s || "").trim().toLowerCase();

// ✅ Import Google Place → MongoDB
// POST /api/import
// Works for BOTH: Admin and Normal user
// Prevents duplicates using placeId
router.post("/", protect, async (req, res) => {
  try {
    const {
      city, // ✅ REQUIRED NOW
      placeId,
      name,
      address = "",
      rating = null,
      photoRef = "",
      imageUrl = "",
    } = req.body;

    const cleanCity = normCity(city);
    if (!cleanCity) {
      return res.status(400).json({ message: "city is required for import" });
    }

    if (!placeId || !name) {
      return res.status(400).json({ message: "placeId and name are required" });
    }

    const cleanPlaceId = String(placeId).trim();

    // ✅ 1) If already imported, return existing
    const existing = await Business.findOne({ placeId: cleanPlaceId });
    if (existing) {
      // If old imported doc has missing city (from before city was required),
      // you can optionally patch it:
      if (!existing.city) {
        existing.city = cleanCity;
        await existing.save();
      }

      return res.status(200).json({
        message: "Already imported",
        business: existing,
      });
    }

    // ✅ 2) Create new document (Google sourced)
    const business = await Business.create({
      city: cleanCity, // ✅ IMPORTANT

      placeId: cleanPlaceId,
      source: "google",
      curated: false,

      name: String(name).trim(),
      address: String(address || "").trim(),

      rating:
        rating === "" || rating === undefined || rating === "N/A" || rating === null
          ? null
          : Number(rating),

      photoRef: String(photoRef || "").trim(),
      imageUrl: String(imageUrl || "").trim(),

      // optional fields
      category: "",
      location: "",

      createdBy: req.user?.id || null,
    });

    return res.status(201).json({
      message: "Imported successfully",
      business,
    });
  } catch (err) {
    console.error("Import Google error:", err);
    return res.status(500).json({ message: "Server error (import google)" });
  }
});

module.exports = router;
