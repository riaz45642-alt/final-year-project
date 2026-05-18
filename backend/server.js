/**
 * TalentBridge — server.js
 *
 * Entry point. Registers middleware and mounts route files.
 * All business logic lives in /routes — keep this file short.
 */

console.log("Server starting…");

const express = require("express");
const cors    = require("cors");
require("dotenv").config();

const app = express();

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api",              require("./routes/setup"));          // /api/setup, /api/test
app.use("/api/jobs",         require("./routes/jobs"));           // /api/jobs/*
app.use("/api/saved",        require("./routes/savedJobs"));      // /api/saved/*
app.use("/api/applications", require("./routes/applications"));   // /api/applications/*
app.use("/api/users",        require("./routes/users"));          // /api/users/*
app.use("/api/cv",           require("./routes/cv"));             // /api/cv/*

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`TalentBridge running on port ${PORT}`);
});
