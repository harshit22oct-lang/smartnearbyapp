const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const Business = require("../models/Business");

const normCity = (s) => String(s || "").trim().toLowerCase();

const toStr = (v) => String(v || "").trim();

router.post("/", protect, async (req, res) => {
  try {
    const b = req.body || {};

    const cleanCity = normCity(b.city);
    const cleanPlaceId = toStr(b.placeId);
    const cleanName = toStr(b.name);

    if (!cleanCity) return res.status(400).json({ message: "city is required for import" });
    if (!cleanPlaceId || !cleanName)
      return res.status(400).json({ message: "placeId and name are required" });

    const cleanAddress = toStr(b.address);
    const cleanPhotoRef = toStr(b.photoRef);
    const cleanImageUrl = toStr(b.imageUrl);

    const parsedRating =
      b.rating === "" || b.rating === undefined || b.rating === "N/A" || b.rating === null
        ? null
        : Number(b.rating);

    // ✅ If already imported, patch missing fields and return
    const existing = await Business.findOne({ placeId: cleanPlaceId });
    if (existing) {
      let changed = false;

      if (!existing.city) {
        existing.city = cleanCity;
        changed = true;
      }
      if (!existing.name && cleanName) {
        existing.name = cleanName;
        changed = true;
      }
      if (!existing.address && cleanAddress) {
        existing.address = cleanAddress;
        changed = true;
      }

      // patch image fields if missing
      if (!existing.photoRef && cleanPhotoRef) {
        existing.photoRef = cleanPhotoRef;
        changed = true;
      }
      if (!existing.imageUrl && cleanImageUrl) {
        existing.imageUrl = cleanImageUrl;
        changed = true;
      }

      // ✅ keep images[] in sync (if empty)
      if ((existing.images || []).length === 0 && cleanImageUrl) {
        existing.images = [cleanImageUrl];
        changed = true;
      }

      // patch rating if missing
      if ((existing.rating === null || existing.rating === undefined) && parsedRating !== null) {
        existing.rating = parsedRating;
        changed = true;
      }

      if (changed) await existing.save();

      return res.status(200).json({
        message: "Already imported",
        business: existing,
      });
    }

    // ✅ Create new Google sourced business
    const created = await Business.create({
      city: cleanCity,

      placeId: cleanPlaceId,
      source: "google",
      curated: false,

      name: cleanName,
      address: cleanAddress,

      rating: Number.isFinite(parsedRating) ? parsedRating : null,

      photoRef: cleanPhotoRef,
      imageUrl: cleanImageUrl,

      // ✅ also store into images[] so new UI works everywhere
      images: cleanImageUrl ? [cleanImageUrl] : [],

      category: "",
      location: "",

      createdBy: req.user?.id || null,
    });

    return res.status(201).json({ message: "Imported successfully", business: created });
  } catch (err) {
    // ✅ handle unique index race-condition safely
    if (err?.code === 11000) {
      try {
        const cleanPlaceId = String(req.body?.placeId || "").trim();
        const existing = await Business.findOne({ placeId: cleanPlaceId });
        if (existing) {
          return res.status(200).json({ message: "Already imported", business: existing });
        }
      } catch (e) {}
    }

    console.error("Import Google error:", err);
    return res.status(500).json({ message: "Server error (import google)" });
  }
});

module.exports = router;