/**
 * Jobs Routes
 *
 *  GET    /api/jobs                   — All active job listings
 *  POST   /api/jobs                   — Create a new job listing
 *  DELETE /api/jobs/:id               — Soft-delete a job listing
 *  GET    /api/jobs/employer/:uid     — All jobs posted by a specific employer
 */

const express = require("express");
const router  = express.Router();
const db      = require("../db");
const timeAgo = require("../helpers/timeAgo");

// ── Get all active jobs ───────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM jobs WHERE active = 1 ORDER BY posted_at DESC"
    );

    const jobs = rows.map(r => ({
      id:        r.id,
      emoji:     r.emoji || "🏢",
      title:     r.title,
      company:   r.company,
      location:  r.location,
      type:      r.type,
      dept:      r.dept,
      mode:      r.mode,
      category:  r.category,
      salaryMin: r.salary_min,
      salaryMax: r.salary_max,
      desc:      r.description,
      tags:      r.tags ? JSON.parse(r.tags) : [],
      remote:    !!r.remote,
      urgent:    !!r.urgent,
      postedBy:  r.posted_by,
      postedAt:  r.posted_at,
      posted:    r.posted_at ? timeAgo(r.posted_at) : "Recently",
    }));

    res.json(jobs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Create a new job listing ──────────────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const j  = req.body;
    const id = j.id || "job_" + Date.now();

    await db.query(
      `INSERT INTO jobs
         (id, emoji, title, company, location, type, dept, mode, category,
          salary_min, salary_max, description, tags, remote, urgent, posted_by, posted_at, active)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)`,
      [
        id, "", j.title, j.company || "", j.location || "",
        j.type || "Full-Time", j.dept || "", j.mode || "On-site", j.category || "",
        j.salaryMin || 0, j.salaryMax || 0, j.desc || "",
        JSON.stringify(j.tags || []),
        j.remote ? 1 : 0, j.urgent ? 1 : 0,
        j.postedBy || null, Date.now(),
      ]
    );

    res.json({ success: true, id });
  } catch (err) {
    console.error("[POST /api/jobs]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Soft-delete a job (sets active = 0) ──────────────────────────────────────
// NOTE: This route must come BEFORE /employer/:uid so Express matches it first
router.delete("/:id", async (req, res) => {
  try {
    await db.query("UPDATE jobs SET active = 0 WHERE id = ?", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Get all jobs posted by a specific employer ────────────────────────────────
router.get("/employer/:uid", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM jobs WHERE posted_by = ? AND active = 1 ORDER BY posted_at DESC",
      [req.params.uid]
    );

    res.json(rows.map(r => ({
      id:        r.id,
      title:     r.title,
      company:   r.company,
      location:  r.location,
      type:      r.type,
      category:  r.category,
      salaryMin: r.salary_min,
      salaryMax: r.salary_max,
      desc:      r.description,
      tags:      r.tags ? JSON.parse(r.tags) : [],
      remote:    !!r.remote,
      urgent:    !!r.urgent,
      postedAt:  r.posted_at,
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
