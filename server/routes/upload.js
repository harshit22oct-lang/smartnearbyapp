const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const protect = require("../middleware/authMiddleware");

// ✅ ensure uploads folder exists
const UPLOAD_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// ✅ image only filter
const fileFilter = (req, file, cb) => {
  const ok = /^image\/(jpeg|jpg|png|webp|gif)$/i.test(file.mimetype);
  if (!ok) return cb(new Error("Only image files are allowed (jpg, png, webp, gif)"));
  cb(null, true);
};

// ✅ safe filename helper
const safeName = (name) =>
  String(name || "image")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9.\-_]/g, "") // remove weird chars
    .slice(-80); // keep filename short

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase() || ".jpg";
    const base = safeName(path.basename(file.originalname || "image", ext));
    const fname = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${base}${ext}`;
    cb(null, fname);
  },
});

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 8 * 1024 * 1024, files: 12 }, // 8MB each, max 12
});

// ✅ POST /api/upload  (Admin only)
router.post("/", protect, (req, res) => {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ message: "Admin only" });
  }

  upload.array("images", 12)(req, res, (err) => {
    if (err) {
      // multer error or our fileFilter error
      const msg =
        err.code === "LIMIT_FILE_SIZE"
          ? "Each file must be <= 8MB"
          : err.code === "LIMIT_FILE_COUNT"
          ? "Max 12 images allowed"
          : err.message || "Upload failed";
      return res.status(400).json({ message: msg });
    }

    const files = req.files || [];
    if (!files.length) {
      return res.status(400).json({ message: "No images received" });
    }

    // ✅ return urls that match your frontend logic
    const urls = files.map((f) => `/uploads/${f.filename}`);
    return res.json({ urls });
  });
});

module.exports = router;
