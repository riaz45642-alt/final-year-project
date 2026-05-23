/**
 * Notifications Routes
 *
 *  GET  /api/notifications/:uid        — Get all notifications for a user
 *  POST /api/notifications             — Create a notification
 *  PUT  /api/notifications/:id/read    — Mark a notification as read
 *  PUT  /api/notifications/:uid/read-all — Mark all as read for user
 */

const express = require("express");
const router  = express.Router();
const db      = require("../db");

// ── Get notifications for a user ──────────────────────────────────────────────
router.get("/:uid", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50",
      [req.params.uid]
    );
    res.json(rows.map(r => ({
      id:        r.id,
      userId:    r.user_id,
      type:      r.type,
      title:     r.title,
      message:   r.message,
      jobId:     r.job_id,
      jobTitle:  r.job_title,
      isRead:    !!r.is_read,
      createdAt: r.created_at,
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Create a notification ─────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const n = req.body;
    await db.query(
      `INSERT INTO notifications (user_id, type, title, message, job_id, job_title, is_read, created_at)
       VALUES (?,?,?,?,?,?,0,?)`,
      [
        n.userId,
        n.type     || "info",
        n.title    || "",
        n.message  || "",
        n.jobId    || null,
        n.jobTitle || null,
        Date.now(),
      ]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Mark one notification as read ─────────────────────────────────────────────
router.put("/:id/read", async (req, res) => {
  try {
    await db.query("UPDATE notifications SET is_read = 1 WHERE id = ?", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Mark all notifications as read for a user ─────────────────────────────────
router.put("/:uid/read-all", async (req, res) => {
  try {
    await db.query("UPDATE notifications SET is_read = 1 WHERE user_id = ?", [req.params.uid]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
