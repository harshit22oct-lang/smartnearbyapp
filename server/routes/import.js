const express = require("express");
const router = express.Router();

const { google } = require("googleapis");

const auth = new google.auth.JWT(
  process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
  null,
  process.env.GOOGLE_SHEETS_PRIVATE_KEY.replace(/\\n/g, "\n"),
  ["https://www.googleapis.com/auth/spreadsheets.readonly"]
);

const sheets = google.sheets({ version: "v4", auth });


// POST /api/import/google-sheet
router.post("/google-sheet", async (req, res) => {
  try {
    const { sheetId, rowNumber } = req.body;

    if (!sheetId || !rowNumber) {
      return res.status(400).json({ error: "sheetId and rowNumber required" });
    }

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `Form Responses 1!A${rowNumber}:Z${rowNumber}`,
    });

    const row = response.data.values[0];

    if (!row) {
      return res.status(404).json({ error: "Row not found" });
    }

    // MAP fields according to your form structure
    const mapped = {
      name: row[1] || "",
      city: row[2] || "",
      category: row[3] || "",
      address: row[4] || "",
      phone: row[6] || "",
      instagram: row[7] || "",
      tags: row[8] ? row[8].split(",").map(t => t.trim()) : [],
      activities: row[9] ? row[9].split(",").map(a => a.trim()) : [],
      highlight: row[10] || "",
      why: row[11] || "",
      images: row[12] ? row[12].split(",").map(i => i.trim()) : [],
    };

    res.json(mapped);

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: "Import failed"
    });

  }
});

module.exports = router;