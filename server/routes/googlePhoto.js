const express = require("express");
const router = express.Router();
const axios = require("axios");

// ✅ NO protect here (images cannot send JWT headers)
router.get("/", async (req, res) => {
  try {
    const photoRef = (req.query.photoRef || "").trim();
    if (!photoRef) return res.status(400).send("photoRef required");

    const response = await axios.get("https://maps.googleapis.com/maps/api/place/photo", {
      params: {
        maxwidth: 900,
        photo_reference: photoRef,
        key: process.env.GOOGLE_API_KEY,
      },
      responseType: "arraybuffer",
      maxRedirects: 5,
    });

    res.setHeader("Content-Type", "image/jpeg");
    // optional cache for 1 day
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(response.data);
  } catch (err) {
    console.error("❌ Google Photo Error:", err.response?.data || err.message);
    res.status(500).send("Photo fetch failed");
  }
});

module.exports = router;
