/**
 * TalentBridge — Express Server
 *
 * FIX SUMMARY:
 *  • Port conflict: listen() error caught → tries PORT+1 automatically
 *  • CORS: reads FRONTEND_URL env var + always allows localhost variants
 *  • Preflight (OPTIONS) handled globally before routes
 *  • NODE_ENV logged on startup so Railway logs are clear
 */

require("dotenv").config();

const express = require("express");
const cors    = require("cors");

const app = express();

// ── CORS ──────────────────────────────────────────────────────────────────────
// Add your Netlify URL in Railway env vars as  FRONTEND_URL=https://your-app.netlify.app
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5000",
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5000",
  process.env.FRONTEND_URL,        // ← set this in Railway dashboard
].filter(Boolean);                 // removes undefined / empty strings

const corsOptions = {
  origin: (origin, cb) => {
    // Allow Postman / curl (no origin header) + whitelisted origins
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    console.warn("⛔ CORS blocked origin:", origin);
    cb(new Error("CORS: origin not allowed — " + origin));
  },
  credentials: true,
  methods:     ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

// Handle preflight (OPTIONS) for every route FIRST
app.options("*", cors(corsOptions));
app.use(cors(corsOptions));

// ── Body parsers ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/", (_req, res) =>
  res.json({
    status:  "TalentBridge API running ✅",
    env:     process.env.NODE_ENV || "development",
    version: "1.0.0",
  })
);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api",              require("./routes/setup"));
app.use("/api/jobs",         require("./routes/jobs"));
app.use("/api/saved",        require("./routes/savedJobs"));
app.use("/api/applications", require("./routes/applications"));
app.use("/api/users",        require("./routes/users"));
app.use("/api/cv",           require("./routes/cv"));

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: "Route not found" }));

// ── Global error handler ──────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err.message);
  // Don't leak CORS errors to the client in production
  if (err.message.startsWith("CORS:")) {
    return res.status(403).json({ error: "CORS: origin not allowed" });
  }
  res.status(500).json({ error: "Internal server error" });
});

// ── Start server with port-conflict fallback ──────────────────────────────────
// Railway injects PORT automatically — never hard-code it.
// Locally: set PORT=8080 in .env, or it defaults to 5000.
const PORT = parseInt(process.env.PORT, 10) || 5000;

function startServer(port) {
  const server = app.listen(port, "0.0.0.0", () => {
    console.log(
      `✅ TalentBridge API running → http://0.0.0.0:${port}` +
      `  [${process.env.NODE_ENV || "development"}]`
    );
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.warn(`⚠️  Port ${port} busy — retrying on ${port + 1}`);
      startServer(port + 1);   // auto-increment once, avoids nodemon duplicates
    } else {
      console.error("Server error:", err);
      process.exit(1);
    }
  });
}

startServer(PORT);
