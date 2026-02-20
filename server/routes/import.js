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

    // ✅ DEBUG (check Render is actually passing env vars)
    console.log("Sheets email exists?", !!clientEmail);
    console.log("Sheets key length:", String(rawKey || "").length);

    if (!clientEmail) {
      return res
        .status(500)
        .json({ error: "Missing GOOGLE_SHEETS_CLIENT_EMAIL on Render" });
    }
    if (!rawKey) {
      return res
        .status(500)
        .json({ error: "Missing GOOGLE_SHEETS_PRIVATE_KEY on Render" });
    }

    // ✅ Works if Render has multiline OR if it has \n text
    // ✅ Also normalize Windows CRLF (\r)
    let privateKey = String(rawKey);

    if (privateKey.includes("\\n")) {
      privateKey = privateKey.replace(/\\n/g, "\n");
    }
    privateKey = privateKey.replace(/\r/g, "").trim();

    // ✅ Sanity check key shape
    if (!privateKey.includes("BEGIN PRIVATE KEY") || !privateKey.includes("END PRIVATE KEY")) {
      return res.status(500).json({
        error:
          "GOOGLE_SHEETS_PRIVATE_KEY format invalid. Must be full PEM with BEGIN/END lines on separate lines.",
      });
    }

    // ✅ Build auth per request
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

    const mapped = {
      name: row[1] || "",
      city: (row[2] || "").trim(),
      category: row[3] || "",
      address: row[4] || "",
      phone: row[6] || "",
      instagram: row[7] || "",
      tags: row[8]
        ? String(row[8]).split(",").map((t) => t.trim()).filter(Boolean)
        : [],
      activities: row[9]
        ? String(row[9]).split(",").map((a) => a.trim()).filter(Boolean)
        : [],
      highlight: row[10] || "",
      why: row[11] || "",
      images: row[12]
        ? String(row[12]).split(",").map((i) => i.trim()).filter(Boolean)
        : [],
    };

    return res.json(mapped);
  } catch (err) {
    const msg =
      err?.response?.data?.error?.message ||
      err?.message ||
      "Import failed";

    console.error("Google Sheet Import Error:", msg);
    return res.status(500).json({ error: msg });
  }
});

module.exports = router;