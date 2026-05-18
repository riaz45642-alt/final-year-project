/**
 * Applications Routes
 *
 *  GET  /api/applications/check/:userId/:jobId  — Check if a user has applied to a job
 *  GET  /api/applications/employer/:uid         — All applications for an employer's jobs
 *  GET  /api/applications/:userId               — All applications submitted by a seeker
 *  POST /api/applications                       — Submit a new application
 *  PUT  /api/applications/:id/status            — Update an application's status
 *
 * ⚠️  ORDER MATTERS: specific paths (/check, /employer) are declared BEFORE
 *     the generic /:userId so Express doesn't swallow them as user IDs.
 */

const express = require("express");
const router  = express.Router();
const db      = require("../db");

// ── Check if a user has already applied to a specific job ─────────────────────
router.get("/check/:userId/:jobId", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id FROM applications WHERE user_id = ? AND job_id = ? LIMIT 1",
      [req.params.userId, req.params.jobId]
    );
    res.json({ applied: rows.length > 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Get all applications received by an employer (across all their jobs) ───────
router.get("/employer/:uid", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT a.*
       FROM   applications a
       JOIN   jobs j ON a.job_id = j.id
       WHERE  j.posted_by = ?
       ORDER  BY a.applied_at DESC`,
      [req.params.uid]
    );

    res.json(rows.map(r => ({
      id:          r.id,
      jobId:       r.job_id,
      userId:      r.user_id,
      seekerName:  r.seeker_name,
      seekerTitle: r.seeker_title,
      appliedAt:   r.applied_at,
      status:      r.status,
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Get all applications submitted by a seeker ────────────────────────────────
router.get("/:userId", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM applications WHERE user_id = ? ORDER BY applied_at DESC",
      [req.params.userId]
    );

    res.json(rows.map(r => ({
      id:         r.id,
      jobId:      r.job_id,
      userId:     r.user_id,
      seekerName: r.seeker_name,
      appliedAt:  r.applied_at,
      status:     r.status,
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Submit a new application ──────────────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const a = req.body;
    await db.query(
      `INSERT IGNORE INTO applications
         (job_id, user_id, seeker_name, seeker_title, applied_at, status)
       VALUES (?,?,?,?,?,?)`,
      [
        a.jobId, a.userId,
        a.seekerName  || "",
        a.seekerTitle || "",
        a.appliedAt   || Date.now(),
        a.status      || "Reviewing",
      ]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Update an application's status ───────────────────────────────────────────
router.put("/:id/status", async (req, res) => {
  try {
    await db.query(
      "UPDATE applications SET status = ? WHERE id = ?",
      [req.body.status, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
