const express = require("express");
const router = express.Router();
const axios = require("axios");
const protect = require("../middleware/authMiddleware");

router.get("/", protect, async (req, res) => {
  try {
    const query = (req.query.q || "").trim();
    if (!query) return res.json([]);

    const response = await axios.get(
      "https://maps.googleapis.com/maps/api/place/textsearch/json",
      {
        params: {
          query,
          key: process.env.GOOGLE_API_KEY,
        },
      }
    );

    if (response.data.status !== "OK" && response.data.status !== "ZERO_RESULTS") {
      return res.status(400).json({
        message: `Google error: ${response.data.status}`,
        details: response.data.error_message || "",
      });
    }

    const places = (response.data.results || []).map((p) => ({
      placeId: p.place_id,
      name: p.name,
      rating: p.rating ?? "N/A",
      address: p.formatted_address || "",
      photoRef: p.photos?.[0]?.photo_reference || "", // ✅ first photo
    }));

    res.json(places);
  } catch (err) {
    console.error("❌ Google Search Error:", err.response?.data || err.message);
    res.status(500).json({ message: "Google search failed" });
  }
});

module.exports = router;
