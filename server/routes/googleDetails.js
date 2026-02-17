const express = require("express");
const router = express.Router();
const axios = require("axios");
const protect = require("../middleware/authMiddleware");

router.get("/", protect, async (req, res) => {
  try {
    const placeId = (req.query.placeId || "").trim();
    if (!placeId) return res.status(400).json({ message: "placeId required" });

    const response = await axios.get(
      "https://maps.googleapis.com/maps/api/place/details/json",
      {
        params: {
          place_id: placeId,
          key: process.env.GOOGLE_API_KEY,
          fields:
            "place_id,name,formatted_address,formatted_phone_number,international_phone_number,website,rating,user_ratings_total,opening_hours,photos,types,url",
        },
      }
    );

    if (response.data.status !== "OK") {
      return res.status(400).json({
        message: `Google error: ${response.data.status}`,
        details: response.data.error_message || "",
      });
    }

    const r = response.data.result;

    // ✅ return ALL photos that Google provides (often up to ~10)
    const photos = (r.photos || []).map((p) => ({
      photoRef: p.photo_reference,
      width: p.width || null,
      height: p.height || null,
    }));

    res.json({
      placeId: r.place_id,
      name: r.name,
      address: r.formatted_address || "",
      phone: r.formatted_phone_number || r.international_phone_number || "",
      website: r.website || "",
      rating: r.rating ?? "N/A",
      totalRatings: r.user_ratings_total ?? 0,
      openNow: r.opening_hours?.open_now ?? null,
      weekdayText: r.opening_hours?.weekday_text || [],
      types: r.types || [],
      googleMapsUrl: r.url || "",
      photos,
    });
  } catch (err) {
    console.error("❌ Google Details Error:", err.response?.data || err.message);
    res.status(500).json({ message: "Google details failed" });
  }
});

module.exports = router;
