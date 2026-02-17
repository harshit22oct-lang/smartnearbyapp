const express = require("express");
const router = express.Router();
const axios = require("axios");
const protect = require("../middleware/authMiddleware");

router.get("/", protect, async (req, res) => {
  try {
    const placeId = String(req.query.placeId || "").trim();
    if (!placeId) return res.status(400).json({ message: "placeId required" });

    if (!process.env.GOOGLE_API_KEY) {
      return res.status(500).json({
        message: "GOOGLE_API_KEY missing on server (Render env variable not set)",
      });
    }

    const url = "https://maps.googleapis.com/maps/api/place/details/json";

    const googleRes = await axios.get(url, {
      timeout: 15000,
      params: {
        place_id: placeId,
        key: process.env.GOOGLE_API_KEY,
        fields:
          "place_id,name,formatted_address,formatted_phone_number,international_phone_number,website,rating,user_ratings_total,opening_hours,photos,types,url",
      },
    });

    const payload = googleRes.data || {};
    const status = payload.status;

    if (status !== "OK") {
      return res.status(400).json({
        message: `Google Places error: ${status}`,
        details: payload.error_message || "No error_message from Google",
      });
    }

    const r = payload.result || {};

    const photos = Array.isArray(r.photos)
      ? r.photos.map((p) => ({
          photoRef: p.photo_reference,
          width: p.width || null,
          height: p.height || null,
        }))
      : [];

    res.json({
      placeId: r.place_id || placeId,
      name: r.name || "",
      address: r.formatted_address || "",
      phone: r.formatted_phone_number || r.international_phone_number || "",
      website: r.website || "",
      rating: typeof r.rating === "number" ? r.rating : null,
      totalRatings: typeof r.user_ratings_total === "number" ? r.user_ratings_total : 0,
      openNow: typeof r.opening_hours?.open_now === "boolean" ? r.opening_hours.open_now : null,
      weekdayText: Array.isArray(r.opening_hours?.weekday_text) ? r.opening_hours.weekday_text : [],
      types: Array.isArray(r.types) ? r.types : [],
      googleMapsUrl: r.url || "",
      photos,
    });
  } catch (err) {
    const googleErr = err?.response?.data;
    console.error("❌ Google Details Error:", googleErr || err.message);

    // If Google returned JSON error, expose it (helps debugging)
    if (googleErr?.status) {
      return res.status(500).json({
        message: "Google details failed",
        googleStatus: googleErr.status,
        details: googleErr.error_message || "",
      });
    }

    res.status(500).json({ message: "Google details failed" });
  }
});

module.exports = router;
