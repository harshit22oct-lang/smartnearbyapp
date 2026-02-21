const express = require("express");
const router = express.Router();
const { google } = require("googleapis");
const fs = require("fs");
const path = require("path");
const protect = require("../middleware/authMiddleware");

// Save downloaded form uploads here
const UPLOAD_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const normCity = (s) => String(s || "").trim().toLowerCase();
const isHttpUrl = (s) => /^https?:\/\/.+/i.test(String(s || "").trim());

const splitList = (raw) => {
  const txt = String(raw || "").trim();
  if (!txt) return [];
  return txt
    .split(/[\n,]+/g)
    .map((x) => x.trim())
    .filter(Boolean);
};

const extractDriveFileId = (url) => {
  const u = String(url || "").trim();
  if (!u) return null;

  let m = u.match(/\/file\/d\/([^/]+)/i);
  if (m && m[1]) return m[1];

  m = u.match(/[?&]id=([^&]+)/i);
  if (m && m[1]) return m[1];

  m = u.match(/\/uc\?[^#]*id=([^&]+)/i);
  if (m && m[1]) return m[1];

  if (/\/folders\//i.test(u)) return null;

  return null;
};

const safeExtFromMime = (mime) => {
  const m = String(mime || "").toLowerCase();
  if (m.includes("jpeg")) return ".jpg";
  if (m.includes("png")) return ".png";
  if (m.includes("webp")) return ".webp";
  if (m.includes("gif")) return ".gif";
  if (m.includes("bmp")) return ".bmp";
  if (m.includes("tiff")) return ".tiff";
  if (m.includes("pdf")) return ".pdf";
  return "";
};

const sanitizeFileName = (name) => {
  const base = String(name || "file")
    .replace(/[^\w.\-]+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 60);
  return base || "file";
};

const downloadDriveFileToUploads = async (drive, fileId) => {
  const metaRes = await drive.files.get({
    fileId,
    fields: "id,name,mimeType",
    supportsAllDrives: true,
  });

  const fileName = sanitizeFileName(metaRes?.data?.name || `drive_${fileId}`);
  const mimeType = metaRes?.data?.mimeType || "";

  const hasExt = /\.[a-z0-9]{2,5}$/i.test(fileName);
  const ext = hasExt ? "" : safeExtFromMime(mimeType);

  let finalName = `${Date.now()}_${fileId}${ext || ""}_${fileName}`;
  finalName = finalName.slice(0, 160); // ✅ avoid giant filenames

  const absPath = path.join(UPLOAD_DIR, finalName);

  const fileRes = await drive.files.get(
    { fileId, alt: "media", supportsAllDrives: true },
    { responseType: "stream" }
  );

  await new Promise((resolve, reject) => {
    const ws = fs.createWriteStream(absPath);
    fileRes.data
      .on("error", reject)
      .pipe(ws)
      .on("error", reject)
      .on("finish", resolve);
  });

  return `/uploads/${finalName}`;
};

// ✅ POST /api/import/google-sheet  (ADMIN ONLY)
router.post("/google-sheet", protect, async (req, res) => {
  try {
    if (!req.user?.isAdmin) return res.status(403).json({ error: "Admin only" });

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

    if (!clientEmail) return res.status(500).json({ error: "Missing GOOGLE_SHEETS_CLIENT_EMAIL" });
    if (!rawKey) return res.status(500).json({ error: "Missing GOOGLE_SHEETS_PRIVATE_KEY" });

    // Normalize private key
    let privateKey = String(rawKey || "");
    privateKey = privateKey.replace(/^"+|"+$/g, "").trim();
    privateKey = privateKey.replace(/\\n/g, "\n");
    privateKey = privateKey.replace(/\r/g, "");
    privateKey = privateKey
      .split("\n")
      .map((line) => line.trim())
      .join("\n")
      .trim();

    if (!privateKey.includes("BEGIN PRIVATE KEY") || !privateKey.includes("END PRIVATE KEY")) {
      return res.status(500).json({
        error: "GOOGLE_SHEETS_PRIVATE_KEY format invalid. Must include BEGIN/END PRIVATE KEY lines.",
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

    if (quotaProject) auth.quotaProjectId = quotaProject;

    await auth.authorize();

    const sheets = google.sheets({ version: "v4", auth });
    const drive = google.drive({ version: "v3", auth });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sid,
      range: `${tab}!A${rn}:Z${rn}`,
    });

    const row = response?.data?.values?.[0];
    if (!row) return res.status(404).json({ error: "Row not found" });

    // ✅ images cell mapping
    const rawImagesCell = row[12] || "";
    const parts = splitList(rawImagesCell);

    // ✅ cap downloads to prevent abuse / slow calls
    const MAX_IMAGES = 6;

    const images = [];
    for (const item of parts) {
      if (!item) continue;
      if (images.length >= MAX_IMAGES) break;

      if (String(item).startsWith("/uploads/")) {
        images.push(String(item).trim());
        continue;
      }

      if (isHttpUrl(item)) {
        const fileId = extractDriveFileId(item);
        if (fileId) {
          try {
            const localUrl = await downloadDriveFileToUploads(drive, fileId);
            images.push(localUrl);
          } catch (e) {
            console.error("Drive download failed for", fileId, e?.message || e);
            images.push(item);
          }
        } else {
          images.push(item);
        }
      }
    }

    const mapped = {
      name: row[1] || "",
      city: normCity(row[2] || ""),
      category: row[3] || "",
      address: row[4] || "",
      phone: row[6] || "",
      instagram: row[7] || "",
      tags: row[8] ? String(row[8]).split(",").map((t) => t.trim()).filter(Boolean) : [],
      activities: row[9] ? String(row[9]).split(",").map((a) => a.trim()).filter(Boolean) : [],
      highlight: row[10] || "",
      why: row[11] || "",
      images,
    };

    return res.json(mapped);
  } catch (err) {
    const msg = err?.response?.data?.error?.message || err?.message || "Import failed";
    console.error("Google Sheet Import Error:", msg);
    return res.status(500).json({ error: msg });
  }
});

module.exports = router;