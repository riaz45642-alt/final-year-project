/**
 * Applications Routes
 *
 *  GET  /api/applications/check/:userId/:jobId   — Check if user applied
 *  GET  /api/applications/employer/:uid          — All applications for employer's jobs
 *  GET  /api/applications/job/:jobId             — All applicants for a specific job
 *  GET  /api/applications/:userId                — All applications by a seeker
 *  POST /api/applications                        — Submit a new application (+ notify employer)
 *  PUT  /api/applications/:id/status             — Update application status
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
      `SELECT a.*, j.title AS job_title, j.company AS job_company
       FROM   applications a
       JOIN   jobs j ON a.job_id = j.id
       WHERE  j.posted_by = ?
       ORDER  BY a.applied_at DESC`,
      [req.params.uid]
    );
    res.json(rows.map(r => ({
      id:           r.id,
      jobId:        r.job_id,
      jobTitle:     r.job_title   || "",
      jobCompany:   r.job_company || "",
      userId:       r.user_id,
      seekerName:   r.seeker_name,
      seekerTitle:  r.seeker_title,
      seekerEmail:  r.seeker_email  || "",
      seekerPhone:  r.seeker_phone  || "",
      coverLetter:  r.cover_letter  || "",
      appliedAt:    r.applied_at,
      status:       r.status,
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Get all applicants for a specific job (employer only) ─────────────────────
router.get("/job/:jobId", async (req, res) => {
  try {
    // Verify the job exists
    const [jobRows] = await db.query("SELECT posted_by FROM jobs WHERE id = ?", [req.params.jobId]);
    if (!jobRows.length) return res.status(404).json({ error: "Job not found" });

    const [rows] = await db.query(
      `SELECT a.*, j.title AS job_title
       FROM   applications a
       JOIN   jobs j ON a.job_id = j.id
       WHERE  a.job_id = ?
       ORDER  BY a.applied_at DESC`,
      [req.params.jobId]
    );
    res.json(rows.map(r => ({
      id:          r.id,
      jobId:       r.job_id,
      jobTitle:    r.job_title    || "",
      userId:      r.user_id,
      seekerName:  r.seeker_name,
      seekerTitle: r.seeker_title,
      seekerEmail: r.seeker_email || "",
      seekerPhone: r.seeker_phone || "",
      coverLetter: r.cover_letter || "",
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
      `SELECT a.*, j.title AS job_title, j.company AS job_company
       FROM applications a
       LEFT JOIN jobs j ON a.job_id = j.id
       WHERE a.user_id = ?
       ORDER BY a.applied_at DESC`,
      [req.params.userId]
    );
    res.json(rows.map(r => ({
      id:          r.id,
      jobId:       r.job_id,
      jobTitle:    r.job_title    || "",
      jobCompany:  r.job_company  || "",
      userId:      r.user_id,
      seekerName:  r.seeker_name,
      appliedAt:   r.applied_at,
      status:      r.status,
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Submit a new application ──────────────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const a = req.body;

    // Prevent duplicate applications
    const [existing] = await db.query(
      "SELECT id FROM applications WHERE user_id = ? AND job_id = ? LIMIT 1",
      [a.userId, a.jobId]
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: "Already applied to this job", alreadyApplied: true });
    }

    // Insert application
    await db.query(
      `INSERT INTO applications
         (job_id, user_id, seeker_name, seeker_title, seeker_email, seeker_phone, cover_letter, applied_at, status)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [
        a.jobId,
        a.userId,
        a.seekerName   || "",
        a.seekerTitle  || "",
        a.seekerEmail  || "",
        a.seekerPhone  || "",
        a.coverLetter  || "",
        a.appliedAt    || Date.now(),
        a.status       || "Reviewing",
      ]
    );

    // Send notification to employer
    try {
      const [jobRows] = await db.query(
        "SELECT title, company, posted_by FROM jobs WHERE id = ?",
        [a.jobId]
      );
      if (jobRows.length && jobRows[0].posted_by) {
        const job = jobRows[0];
        await db.query(
          `INSERT INTO notifications (user_id, type, title, message, job_id, job_title, is_read, created_at)
           VALUES (?,?,?,?,?,?,0,?)`,
          [
            job.posted_by,
            "application",
            "New Application Received",
            `${a.seekerName || "A candidate"} has applied to your job: "${job.title}"`,
            a.jobId,
            job.title,
            Date.now(),
          ]
        );
      }
    } catch (notifErr) {
      console.error("[notification] Failed to send:", notifErr.message);
      // Non-fatal — application was still saved
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Cancel (delete) a seeker's own application ───────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    const [result] = await db.query(
      "DELETE FROM applications WHERE id = ?",
      [req.params.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Application not found" });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Update an application's status ───────────────────────────────────────────
router.put("/:id/status", async (req, res) => {
  try {
    const validStatuses = ["Reviewing", "Shortlisted", "Interview", "Offered", "Rejected"];
    const { status } = req.body;
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status value" });
    }
    await db.query(
      "UPDATE applications SET status = ? WHERE id = ?",
      [status, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
