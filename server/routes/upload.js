const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const protect = require("../middleware/authMiddleware");

// ✅ ensure uploads folder exists
const UPLOAD_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ✅ image only filter (mime-based)
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
    .replace(/[^a-z0-9.\-_]/g, "")
    .slice(-80);

// ✅ map mimetype -> extension (more accurate than trusting original filename)
const extFromMime = (mime) => {
  const m = String(mime || "").toLowerCase();
  if (m.includes("png")) return ".png";
  if (m.includes("webp")) return ".webp";
  if (m.includes("gif")) return ".gif";
  return ".jpg"; // jpeg/jpg default
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = extFromMime(file.mimetype);
    const base = safeName(path.basename(file.originalname || "image", path.extname(file.originalname || "")));
    const fname = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${base}${ext}`;
    cb(null, fname);
  },
});

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 8 * 1024 * 1024, files: 12 },
});

const uploadProfile = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 }, // profile smaller
});

const multerMsg = (err) => {
  if (!err) return "Upload failed";
  if (err.code === "LIMIT_FILE_SIZE") return "File must be <= 8MB";
  if (err.code === "LIMIT_FILE_COUNT") return "Too many files";
  if (err.code === "LIMIT_UNEXPECTED_FILE") return "Unexpected field name (use correct form field)";
  return err.message || "Upload failed";
};

// ✅ POST /api/upload  (Admin only) - MULTI
router.post("/", protect, (req, res) => {
  if (!req.user?.isAdmin) return res.status(403).json({ message: "Admin only" });

  upload.array("images", 12)(req, res, (err) => {
    if (err) return res.status(400).json({ message: multerMsg(err) });

    const files = req.files || [];
    if (!files.length) return res.status(400).json({ message: "No images received" });

    const urls = files.map((f) => `/uploads/${f.filename}`);
    return res.json({ urls });
  });
});

// ✅ POST /api/upload/user (Any logged-in user) - SINGLE
router.post("/user", protect, (req, res) => {
  upload.single("image")(req, res, (err) => {
    if (err) return res.status(400).json({ message: multerMsg(err) });

    if (!req.file?.filename) return res.status(400).json({ message: "No image received" });

    return res.json({ url: `/uploads/${req.file.filename}` });
  });
});

// ✅ POST /api/upload/user-multi (Any logged-in user) - MULTI
router.post("/user-multi", protect, (req, res) => {
  upload.array("images", 8)(req, res, (err) => {
    if (err) return res.status(400).json({ message: multerMsg(err) });

    const files = req.files || [];
    if (!files.length) return res.status(400).json({ message: "No images received" });

    const urls = files.map((f) => `/uploads/${f.filename}`);
    return res.json({ urls });
  });
});

// ✅ POST /api/upload/profile
router.post("/profile", protect, (req, res) => {
  uploadProfile.single("image")(req, res, async (err) => {
    try {
      if (err) return res.status(400).json({ message: multerMsg(err) });

      if (!req.file?.filename) return res.status(400).json({ message: "No image uploaded" });

      const url = `/uploads/${req.file.filename}`;

      req.user.profilePicture = url;
      await req.user.save();

      return res.json({ url });
    } catch (e) {
      return res.status(500).json({ message: "Profile upload failed" });
    }
  });
});

module.exports = router;