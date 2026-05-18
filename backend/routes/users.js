/**
 * Users / Profiles Routes
 *
 *  GET   /api/users/:uid        — Get a user's profile
 *  POST  /api/users             — Create or update a user profile (upsert)
 *  PATCH /api/users/:uid/role   — Switch a user's role (seeker ↔ employer)
 */

const express = require("express");
const router  = express.Router();
const db      = require("../db");

// ── Get a user's profile ──────────────────────────────────────────────────────
router.get("/:uid", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM users WHERE uid = ?",
      [req.params.uid]
    );

    if (!rows.length) return res.json(null);

    const u = rows[0];
    res.json({
      id:         u.uid,
      name:       u.name,
      email:      u.email,
      role:       u.role,
      avatar:     u.avatar,
      title:      u.title,
      location:   u.location || "",
      bio:        u.bio,
      skills:     u.skills     ? JSON.parse(u.skills)     : [],
      experience: u.experience ? JSON.parse(u.experience) : [],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Create or update a user profile (upsert) ─────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const u = req.body;
    await db.query(
      `INSERT INTO users
         (uid, name, email, role, avatar, title, location, bio, skills, experience, joined_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE
         name=VALUES(name), email=VALUES(email), role=VALUES(role),
         avatar=VALUES(avatar), title=VALUES(title), location=VALUES(location),
         bio=VALUES(bio), skills=VALUES(skills), experience=VALUES(experience),
         updated_at=VALUES(updated_at)`,
      [
        u.id || u.uid,
        u.name       || "",
        u.email      || "",
        u.role       || "seeker",
        u.avatar     || "",
        u.title      || "",
        u.location   || "",
        u.bio        || "",
        JSON.stringify(u.skills      || []),
        JSON.stringify(u.experience  || []),
        u.joinedAt   || Date.now(),
        Date.now(),
      ]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Switch a user's role (seeker ↔ employer) ──────────────────────────────────
router.patch("/:uid/role", async (req, res) => {
  try {
    const { role } = req.body;

    if (!["seeker", "employer"].includes(role)) {
      return res.status(400).json({ error: "Invalid role. Must be 'seeker' or 'employer'." });
    }

    await db.query("UPDATE users SET role = ? WHERE uid = ?", [role, req.params.uid]);
    res.json({ success: true, role });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
