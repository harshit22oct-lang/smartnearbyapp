require("dotenv").config(); // ALWAYS first

const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");

const connectDB = require("./config/db");

// routes
const authRoutes = require("./routes/authRoutes");
const searchRoutes = require("./routes/search");

const app = express();

// -------------------
// ✅ Middleware
// -------------------
app.use(cors());
app.use(express.json({ limit: "2mb" })); // JSON size limit (safe)

// ✅ Stop 304 caching for API responses
app.disable("etag");
app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");
  next();
});

// -------------------
// ✅ Static uploads
// -------------------
const UPLOAD_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Example: http://localhost:5000/uploads/your-file.jpg
app.use("/uploads", express.static(UPLOAD_DIR));

// -------------------
// ✅ DB Connect
// -------------------
connectDB();

// -------------------
// ✅ Home
// -------------------
app.get("/", (req, res) => {
  res.send("SmartNearbyApp Backend is running ✅");
});

// -------------------
// ✅ API Routes
// -------------------
app.use("/api/auth", authRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/favorites", require("./routes/favorites"));

app.use("/api/google", require("./routes/googleSearch"));
app.use("/api/import", require("./routes/importGoogle"));
app.use("/api/google/details", require("./routes/googleDetails"));
app.use("/api/google/photo", require("./routes/googlePhoto"));
app.use("/api/google-actions", require("./routes/googleSave"));

// ✅ NEW: admin upload route
app.use("/api/upload", require("./routes/upload"));

// -------------------
// ✅ 404 handler
// -------------------
app.use((req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
});

// -------------------
// ✅ Global error handler
// -------------------
app.use((err, req, res, next) => {
  console.error("🔥 Server error:", err);
  res.status(500).json({ message: "Internal server error" });
});

// -------------------
// ✅ Start server
// -------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
