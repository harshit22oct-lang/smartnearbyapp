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

    if (!sid) return res.status(400).json({ error: "sheetId required" });
    if (!Number.isFinite(rn) || rn < 2)
      return res.status(400).json({ error: "rowNumber must be >= 2" });

    const clientEmail = String(process.env.GOOGLE_SHEETS_CLIENT_EMAIL || "").trim();
    const rawKey = String(process.env.GOOGLE_SHEETS_PRIVATE_KEY || "");

    const quotaProject =
      String(process.env.GOOGLE_CLOUD_QUOTA_PROJECT || "").trim() ||
      String(process.env.GOOGLE_CLOUD_PROJECT || "").trim();

    console.log("Sheets email exists?", !!clientEmail);
    console.log("Sheets key length:", rawKey.length);
    console.log("Quota project:", quotaProject || "(missing)");

    if (!clientEmail) return res.status(500).json({ error: "Missing GOOGLE_SHEETS_CLIENT_EMAIL" });
    if (!rawKey) return res.status(500).json({ error: "Missing GOOGLE_SHEETS_PRIVATE_KEY" });

    // ✅ Normalize key for BOTH cases:
    // - Render multiline
    // - local .env one-line with \n
    let privateKey = String(rawKey || "");

    // remove wrapping quotes if any (sometimes copied with quotes)
    privateKey = privateKey.replace(/^"+|"+$/g, "").trim();

    // convert literal \n into real newlines
    privateKey = privateKey.replace(/\\n/g, "\n");

    // remove CRLF
    privateKey = privateKey.replace(/\r/g, "");

    // remove leading/trailing spaces on each line (paste issues)
    privateKey = privateKey
      .split("\n")
      .map((line) => line.trim())
      .join("\n")
      .trim();

    if (!privateKey.includes("BEGIN PRIVATE KEY") || !privateKey.includes("END PRIVATE KEY")) {
      return res.status(500).json({
        error:
          "GOOGLE_SHEETS_PRIVATE_KEY format invalid. Must include BEGIN/END PRIVATE KEY lines.",
      });
    }

    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: [
        "https://www.googleapis.com/auth/spreadsheets.readonly",
        "https://www.googleapis.com/auth/drive.readonly",
      ],
    });

    // ✅ attach quota project identity (helps “unregistered callers”)
    if (quotaProject) auth.quotaProjectId = quotaProject;

    // ✅ force token fetch (ensures request is not anonymous)
    await auth.authorize();

    const sheets = google.sheets({ version: "v4", auth });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sid,
      range: `${tab}!A${rn}:Z${rn}`,
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
      tags: row[8] ? String(row[8]).split(",").map(t => t.trim()).filter(Boolean) : [],
      activities: row[9] ? String(row[9]).split(",").map(a => a.trim()).filter(Boolean) : [],
      highlight: row[10] || "",
      why: row[11] || "",
      images: row[12] ? String(row[12]).split(",").map(i => i.trim()).filter(Boolean) : [],
    };

    return res.json(mapped);
  } catch (err) {
    const msg = err?.response?.data?.error?.message || err?.message || "Import failed";
    console.error("Google Sheet Import Error:", msg);
    return res.status(500).json({ error: msg });
  }
});

module.exports = router;