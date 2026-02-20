require("dotenv").config(); // ALWAYS FIRST

const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");

const connectDB = require("./config/db");

// routes
const authRoutes = require("./routes/authRoutes");
const searchRoutes = require("./routes/search");

const app = express();


// =====================================================
// ✅ PERFECT CORS CONFIG FOR VERCEL + MOBILE + RENDER
// =====================================================

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",

  "https://smartnearbyapp.vercel.app",
  "https://moodnest.vercel.app",
  "https://www.moodnest.in",
  "https://moodnest.in"

  // optional: if using custom domain later
];

app.use(
  cors({
    origin: function (origin, callback) {

      // allow mobile apps, curl, postman
      if (!origin) return callback(null, true);

      // allow exact matches
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // allow ALL vercel preview domains
      if (origin.endsWith(".vercel.app")) {
        return callback(null, true);
      }

      console.log("❌ CORS blocked:", origin);

      return callback(new Error("CORS blocked"));
    },

    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],

    allowedHeaders: [
      "Content-Type",
      "Authorization"
    ],

    credentials: true
  })
);


// =====================================================
// ✅ IMPORTANT: HANDLE PREFLIGHT PROPERLY
// =====================================================

app.options("*", cors());


// =====================================================
// ✅ BODY PARSER
// =====================================================

app.use(express.json({ limit: "5mb" }));


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

  res.send("SmartNearbyApp Backend Running ✅");

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

app.use("/api/import", require("./routes/importGoogle"));

app.use("/api/google-actions", require("./routes/googleSave"));

app.use("/api/upload", require("./routes/upload"));


// =====================================================
// ✅ 404 HANDLER
// =====================================================

app.use((req, res) => {

  res.status(404).json({

    message: `Route not found: ${req.method} ${req.originalUrl}`

  });

});


// =====================================================
// ✅ GLOBAL ERROR HANDLER
// =====================================================

app.use((err, req, res, next) => {

  console.error("🔥 SERVER ERROR:", err.message);

  res.status(500).json({

    message: err.message || "Internal Server Error"

  });

});


// =====================================================
// ✅ START SERVER
// =====================================================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {

  console.log(`Server running on port ${PORT}`);

});
