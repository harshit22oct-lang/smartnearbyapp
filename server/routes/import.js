const express = require("express");
const router = express.Router();
const { google } = require("googleapis");

// POST /api/import/google-sheet
router.post("/google-sheet", async (req, res) => {
  try {
    const { sheetId, rowNumber } = req.body || {};

    if (!sheetId || !rowNumber) {
      return res.status(400).json({ error: "sheetId and rowNumber required" });
    }

    const clientEmail = (process.env.GOOGLE_SHEETS_CLIENT_EMAIL || "").trim();
    const rawKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY || "";

    if (!clientEmail) {
      return res.status(500).json({ error: "Missing GOOGLE_SHEETS_CLIENT_EMAIL on server" });
    }
    if (!rawKey) {
      return res.status(500).json({ error: "Missing GOOGLE_SHEETS_PRIVATE_KEY on server" });
    }

    // Works whether Render stored multi-line OR stored with \n
    const privateKey = String(rawKey).includes("\\n")
      ? String(rawKey).replace(/\\n/g, "\n")
      : String(rawKey);

    // Build auth PER REQUEST (more reliable on Render)
    const auth = new google.auth.JWT(
      clientEmail,
      null,
      privateKey,
      ["https://www.googleapis.com/auth/spreadsheets.readonly"]
    );

    const sheets = google.sheets({ version: "v4", auth });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: String(sheetId).trim(),
      range: `Form Responses 1!A${Number(rowNumber)}:Z${Number(rowNumber)}`,
    });

    const row = response?.data?.values?.[0];

    if (!row) {
      return res.status(404).json({ error: "Row not found" });
    }

    // Map columns (edit indexes if your form differs)
    const mapped = {
      name: row[1] || "",
      city: (row[2] || "").trim(),
      category: row[3] || "",
      address: row[4] || "",
      phone: row[6] || "",
      instagram: row[7] || "",
      tags: row[8] ? String(row[8]).split(",").map((t) => t.trim()).filter(Boolean) : [],
      activities: row[9] ? String(row[9]).split(",").map((a) => a.trim()).filter(Boolean) : [],
      highlight: row[10] || "",
      why: row[11] || "",
      images: row[12] ? String(row[12]).split(",").map((i) => i.trim()).filter(Boolean) : [],
    };

    return res.json(mapped);
  } catch (err) {
    console.error("Google Sheet Import Error:", err?.message || err);
    return res.status(500).json({
      error: err?.message || "Import failed",
    });
  }
});

module.exports = router;