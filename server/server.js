require("dotenv").config(); // ALWAYS FIRST

const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");

const connectDB = require("./config/db");

// routes
const authRoutes = require("./routes/authRoutes");
const searchRoutes = require("./routes/search");

// ✅ Sheet import router (must contain POST /google-sheet)
const importRoute = require("./routes/import");

// ✅ Old google import router (your renamed file)
const importGoogleOldRoute = require("./routes/importGoogle_old");

const app = express();

// =====================================================
// ✅ CORS CONFIG (RENDER SAFE)
// =====================================================

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",

  "https://moodnest.in",
  "https://www.moodnest.in",

  "https://smartnearbyapp.vercel.app",
  "https://moodnest.vercel.app",
];

const corsOptions = {
  origin: function (origin, callback) {
    // allow mobile apps, curl, postman
    if (!origin) return callback(null, true);

    // allow exact matches
    if (allowedOrigins.includes(origin)) return callback(null, true);

    // allow ALL vercel preview domains (safe guard if origin is not string)
    if (typeof origin === "string" && origin.endsWith(".vercel.app")) {
      return callback(null, true);
    }

    console.log("❌ CORS blocked:", origin);
    return callback(new Error("CORS blocked"));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

app.use(cors(corsOptions));

// (optional but helpful) handle preflight quickly
app.options("*", cors(corsOptions));

// =====================================================
// ✅ BODY PARSER
// =====================================================

app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));

// =====================================================
// ✅ PREVENT CACHING
// =====================================================

app.disable("etag");

app.use((req, res, next) => {
  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate"
  );
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});

// =====================================================
// ✅ STATIC UPLOADS
// =====================================================

const UPLOAD_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}
app.use("/uploads", express.static(UPLOAD_DIR));

// =====================================================
// ✅ CONNECT DATABASE
// =====================================================

connectDB();

// =====================================================
// ✅ HOME
// =====================================================

app.get("/", (req, res) => {
  res.send("MoodNest Backend Running ✅");
});

// =====================================================
// ✅ API ROUTES
// =====================================================

app.use("/api/auth", authRoutes);
app.use("/api/search", searchRoutes);

app.use("/api/favorites", require("./routes/favorites"));
app.use("/api/google", require("./routes/googleSearch"));
app.use("/api/google/details", require("./routes/googleDetails"));
app.use("/api/google/photo", require("./routes/googlePhoto"));
app.use("/api/google-actions", require("./routes/googleSave"));

// ✅ Upload (admin multi + user single)
app.use("/api/upload", require("./routes/upload"));

// ✅ User submissions (pending) + admin approve/reject
app.use("/api/submissions", require("./routes/submissions"));

// ✅ NEW: Sheet import routes (NO conflict)
app.use("/api/import", importRoute);

// ✅ NEW: Old google import routes moved to separate base path
app.use("/api/import-google", importGoogleOldRoute);

// =====================================================
// ✅ 404 HANDLER
// =====================================================

app.use((req, res) => {
  res.status(404).json({
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// =====================================================
// ✅ GLOBAL ERROR HANDLER
// =====================================================

app.use((err, req, res, next) => {
  const msg = err?.message || "Internal Server Error";
  console.error("🔥 SERVER ERROR:", msg);

  // if CORS blocked, return 403 (cleaner than 500)
  if (msg === "CORS blocked") {
    return res.status(403).json({ message: "CORS blocked" });
  }

  // default
  return res.status(500).json({ message: msg });
});

// =====================================================
// ✅ START SERVER
// =====================================================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});