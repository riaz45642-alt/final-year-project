/**
 * Saved Jobs Routes
 *
 *  GET    /api/saved/:userId          — Get all saved job IDs for a user
 *  POST   /api/saved                  — Save a job for a user
 *  DELETE /api/saved/:userId/:jobId   — Unsave a job
 */

const express = require("express");
const router  = express.Router();
const db      = require("../db");

// ── Get all saved job IDs for a user ─────────────────────────────────────────
router.get("/:userId", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT job_id FROM saved_jobs WHERE user_id = ?",
      [req.params.userId]
    );
    res.json(rows.map(r => ({ jobId: r.job_id })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Save a job for a user ─────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const { userId, jobId } = req.body;
    await db.query(
      "INSERT IGNORE INTO saved_jobs (user_id, job_id, saved_at) VALUES (?,?,?)",
      [userId, jobId, Date.now()]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Unsave a job ──────────────────────────────────────────────────────────────
router.delete("/:userId/:jobId", async (req, res) => {
  try {
    await db.query(
      "DELETE FROM saved_jobs WHERE user_id = ? AND job_id = ?",
      [req.params.userId, req.params.jobId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
