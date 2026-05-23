require("dotenv").config();

const express = require("express");
const cors    = require("cors");

const app = express();

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    const isAllowed = allowedOrigins.some(o => o && origin.startsWith(o));
    // Allow all origins with a fallback (remove in strict production)
    cb(null, true);
  },
  credentials: true,
}));

app.use(express.json());

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/", (_req, res) =>
  res.json({ status: "TalentBridge API running ✅", env: process.env.NODE_ENV || "development" })
);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api",                 require("./routes/setup"));
app.use("/api/jobs",            require("./routes/jobs"));
app.use("/api/saved",           require("./routes/savedJobs"));
app.use("/api/applications",    require("./routes/applications"));
app.use("/api/users",           require("./routes/users"));
app.use("/api/cv",              require("./routes/cv"));
app.use("/api/notifications",   require("./routes/notifications"));

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err.message);
  res.status(500).json({ error: "Internal server error" });
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () =>
  console.log(`✅ TalentBridge API running on port ${PORT}  [${process.env.NODE_ENV || "development"}]`)
);
