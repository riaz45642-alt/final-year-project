/**
 * CV Routes
 *
 *  GET  /api/cv/:uid   — Get a user's saved CV data
 *  POST /api/cv        — Save (or update) a user's CV data (upsert)
 */

const express = require("express");
const router  = express.Router();
const db      = require("../db");

// ── Get a user's CV data ──────────────────────────────────────────────────────
router.get("/:uid", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM cv_data WHERE user_id = ?",
      [req.params.uid]
    );

    if (!rows.length) return res.json(null);

    const r = rows[0];
    res.json({
      user_id:           r.user_id,
      first_name:        r.first_name,
      last_name:         r.last_name,
      job_title:         r.job_title,
      email:             r.email,
      phone:             r.phone,
      location:          r.location,
      summary:           r.summary,
      skills:            r.skills,
      education:         r.education  ? JSON.parse(r.education)  : [],
      experience:        r.experience ? JSON.parse(r.experience) : [],
      selected_template: r.selected_template || "blue",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Save or update a user's CV data (upsert) ─────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const c = req.body;

    if (!c.user_id) {
      return res.status(400).json({ error: "user_id is required." });
    }

    await db.query(
      `INSERT INTO cv_data
         (user_id, first_name, last_name, job_title, email, phone, location,
          summary, skills, education, experience, selected_template)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE
         first_name=VALUES(first_name), last_name=VALUES(last_name),
         job_title=VALUES(job_title), email=VALUES(email), phone=VALUES(phone),
         location=VALUES(location), summary=VALUES(summary), skills=VALUES(skills),
         education=VALUES(education), experience=VALUES(experience),
         selected_template=VALUES(selected_template)`,
      [
        c.user_id,
        c.first_name || "",
        c.last_name  || "",
        c.job_title  || "",
        c.email      || "",
        c.phone      || "",
        c.location   || "",
        c.summary    || "",
        c.skills     || "",
        typeof c.education  === "string" ? c.education  : JSON.stringify(c.education  || []),
        typeof c.experience === "string" ? c.experience : JSON.stringify(c.experience || []),
        c.selected_template || "blue",
      ]
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
