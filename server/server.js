require("dotenv").config();

const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");

const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const searchRoutes = require("./routes/search");
const importRoute = require("./routes/import");
const importGoogleOldRoute = require("./routes/importGoogle_old");

const app = express();


// =====================================================
// ✅ CORS
// =====================================================

// =====================================================
// ✅ CORS (Production ready - supports custom domain + www + vercel)
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

    // allow Postman / mobile apps
    if (!origin)
      return callback(null, true);

    // allow exact matches
    if (allowedOrigins.includes(origin))
      return callback(null, true);

    // allow all vercel preview deployments
    if (origin.endsWith(".vercel.app"))
      return callback(null, true);

    // allow any subdomain of moodnest.in (future proof)
    if (origin.endsWith(".moodnest.in"))
      return callback(null, true);

    console.log("❌ CORS blocked:", origin);

    return callback(new Error("CORS blocked"));

  },

  credentials: true,

};

app.use(cors(corsOptions));
// =====================================================
// BODY PARSER
// =====================================================

app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));


// =====================================================
// STATIC UPLOADS
// =====================================================

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

if (!fs.existsSync(UPLOAD_DIR))
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });

app.use("/uploads", express.static(UPLOAD_DIR));


// =====================================================
// CONNECT DB
// =====================================================

connectDB();


// =====================================================
// HOME
// =====================================================

app.get("/", (req, res) => {

  res.send("MoodNest Backend Running ✅");

});


// =====================================================
// ROUTES
// =====================================================

app.use("/api/auth", authRoutes);

app.use("/api/search", searchRoutes);

app.use("/api/favorites", require("./routes/favorites"));

app.use("/api/google", require("./routes/googleSearch"));

app.use("/api/google/details", require("./routes/googleDetails"));

app.use("/api/google/photo", require("./routes/googlePhoto"));

app.use("/api/google-actions", require("./routes/googleSave"));

app.use("/api/upload", require("./routes/upload"));

app.use("/api/submissions", require("./routes/submissions"));

app.use("/api/import", importRoute);

app.use("/api/import-google", importGoogleOldRoute);

app.use("/api/events", require("./routes/events"));
app.use("/api/tickets", require("./routes/tickets"));


// =====================================================
// 404
// =====================================================

app.use((req, res) => {

  res.status(404).json({

    message: "Route not found",

  });

});


// =====================================================
// ERROR HANDLER
// =====================================================

app.use((err, req, res, next) => {

  console.error(err.message);

  res.status(500).json({

    message: err.message || "Server error",

  });

});


// =====================================================
// START
// =====================================================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {

  console.log("Server running on port " + PORT);

});