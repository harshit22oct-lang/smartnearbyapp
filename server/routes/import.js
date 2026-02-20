const express = require("express");
const router = express.Router();
const { google } = require("googleapis");

// POST /api/import/google-sheet
router.post("/google-sheet", async (req, res) => {
  try {
    const { sheetId, rowNumber, sheetName } = req.body || {};

    const sid = String(sheetId || "").trim();
    const rn = Number(rowNumber);
    const tab = String(sheetName || "Form Responses 1").trim();

    if (!sid) {
      return res.status(400).json({ error: "sheetId required" });
    }
    if (!Number.isFinite(rn) || rn < 1) {
      return res.status(400).json({ error: "rowNumber must be a valid number >= 1" });
    }

    const clientEmail = String(process.env.GOOGLE_SHEETS_CLIENT_EMAIL || "").trim();
    const rawKey = String(process.env.GOOGLE_SHEETS_PRIVATE_KEY || "");

    // ✅ DEBUG (Render env check)
    console.log("Sheets email exists?", !!clientEmail);
    console.log("Sheets key length:", rawKey.length);

    if (!clientEmail) {
      return res.status(500).json({ error: "Missing GOOGLE_SHEETS_CLIENT_EMAIL on Render" });
    }
    if (!rawKey) {
      return res.status(500).json({ error: "Missing GOOGLE_SHEETS_PRIVATE_KEY on Render" });
    }

    // ✅ Normalize key (Render often stores \n literally)
    let privateKey = rawKey;
    if (privateKey.includes("\\n")) privateKey = privateKey.replace(/\\n/g, "\n");
    privateKey = privateKey.replace(/\r/g, "").trim();

    if (
      !privateKey.includes("BEGIN PRIVATE KEY") ||
      !privateKey.includes("END PRIVATE KEY")
    ) {
      return res.status(500).json({
        error:
          "GOOGLE_SHEETS_PRIVATE_KEY format invalid. Must be full PEM with BEGIN/END lines.",
      });
    }

    // ✅ Auth
    const auth = new google.auth.JWT(
      clientEmail,
      null,
      privateKey,
      [
        "https://www.googleapis.com/auth/spreadsheets.readonly",
        "https://www.googleapis.com/auth/drive.readonly",
      ]
    );

    const sheets = google.sheets({ version: "v4", auth });

    const range = `${tab}!A${rn}:Z${rn}`;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sid,
      range,
    });

    const row = response?.data?.values?.[0];
    if (!row) return res.status(404).json({ error: "Row not found" });

    const mapped = {
      name: row[1] || "",
      city: String(row[2] || "").trim(),
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

    return res.json({ range, mapped });
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