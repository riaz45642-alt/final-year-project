// ══════════════════════════════════════════════
//  TALENTBRIDGE — server.js  (TiDB Edition)
//  All MongoDB references removed.
//  Connects to TiDB Cloud via mysql2.
// ══════════════════════════════════════════════

console.log("1. Server file loaded");

const express = require("express");
const cors    = require("cors");
require("dotenv").config();

// 🔧 TiDB: db.js creates a mysql2 connection pool pointed at TiDB Cloud
const db = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

/* ─────────────────────────────────────────────
   DB SETUP — run once to create tables
   Call GET /api/setup the first time you deploy.
───────────────────────────────────────────── */
// 🔧 TiDB: creates all required tables in your TiDB database
app.get("/api/setup", async (req, res) => {
  try {
    // Users table — stores Firebase UID as primary key
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        uid         VARCHAR(128) PRIMARY KEY,
        name        VARCHAR(255),
        email       VARCHAR(255),
        role        VARCHAR(20)  DEFAULT 'seeker',
        avatar      VARCHAR(10),
        title       VARCHAR(255),
        bio         TEXT,
        skills      TEXT,
        experience  TEXT,
        joined_at   BIGINT,
        updated_at  BIGINT
      )
    `);

    // Jobs table — stores job listings posted by employers
    await db.query(`
      CREATE TABLE IF NOT EXISTS jobs (
        id          VARCHAR(64)  PRIMARY KEY,
        emoji       VARCHAR(10),
        title       VARCHAR(255) NOT NULL,
        company     VARCHAR(255),
        location    VARCHAR(255),
        type        VARCHAR(50),
        dept        VARCHAR(100),
        mode        VARCHAR(50),
        category    VARCHAR(50),
        salary_min  INT,
        salary_max  INT,
        description TEXT,
        tags        TEXT,
        remote      TINYINT(1) DEFAULT 0,
        urgent      TINYINT(1) DEFAULT 0,
        posted_by   VARCHAR(128),
        posted_at   BIGINT,
        active      TINYINT(1) DEFAULT 1
      )
    `);

    // Saved jobs table — many-to-many: users <-> jobs
    await db.query(`
      CREATE TABLE IF NOT EXISTS saved_jobs (
        id          BIGINT AUTO_INCREMENT PRIMARY KEY,
        user_id     VARCHAR(128) NOT NULL,
        job_id      VARCHAR(64)  NOT NULL,
        saved_at    BIGINT,
        UNIQUE KEY unique_save (user_id, job_id)
      )
    `);

    // Applications table — job applications by seekers
    await db.query(`
      CREATE TABLE IF NOT EXISTS applications (
        id           BIGINT AUTO_INCREMENT PRIMARY KEY,
        job_id       VARCHAR(64)  NOT NULL,
        user_id      VARCHAR(128) NOT NULL,
        seeker_name  VARCHAR(255),
        seeker_title VARCHAR(255),
        applied_at   BIGINT,
        status       VARCHAR(50)  DEFAULT 'Reviewing',
        UNIQUE KEY unique_application (user_id, job_id)
      )
    `);

    res.json({ success: true, message: "All tables created successfully in TiDB." });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ─────────────────────────────────────────────
   CONNECTION TEST
───────────────────────────────────────────── */
// 🔧 TiDB: simple ping to verify database connection
app.get("/api/test", async (req, res) => {
  try {
    await db.query("SELECT 1");
    res.json({ success: true, message: "TiDB connected successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ─────────────────────────────────────────────
   JOBS ROUTES
───────────────────────────────────────────── */
// 🔧 TiDB: GET all active jobs from TiDB jobs table
app.get("/api/jobs", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM jobs WHERE active = 1 ORDER BY posted_at DESC");
    // Normalise column names and parse JSON fields for the frontend
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

// 🔧 TiDB: POST a new job — inserts into TiDB jobs table
app.post("/api/jobs", async (req, res) => {
  try {
    const j = req.body;
    const id = j.id || ("job_" + Date.now());
    await db.query(
      `INSERT INTO jobs (id, emoji, title, company, location, type, dept, mode, category,
        salary_min, salary_max, description, tags, remote, urgent, posted_by, posted_at, active)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)`,
      [
        id, j.emoji||"🏢", j.title, j.company||"", j.location||"", j.type||"Full-Time",
        j.dept||"", j.mode||"On-site", j.category||"",
        j.salaryMin||0, j.salaryMax||0, j.desc||"",
        JSON.stringify(j.tags||[]),
        j.remote?1:0, j.urgent?1:0,
        j.postedBy||null, Date.now()
      ]
    );
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔧 TiDB: DELETE (soft-delete) a job by setting active=0 in TiDB
app.delete("/api/jobs/:id", async (req, res) => {
  try {
    await db.query("UPDATE jobs SET active = 0 WHERE id = ?", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔧 TiDB: GET jobs posted by a specific employer
app.get("/api/jobs/employer/:uid", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM jobs WHERE posted_by = ? AND active = 1 ORDER BY posted_at DESC",
      [req.params.uid]
    );
    res.json(rows.map(r => ({
      id: r.id, title: r.title, company: r.company, location: r.location,
      type: r.type, category: r.category, salaryMin: r.salary_min, salaryMax: r.salary_max,
      desc: r.description, tags: r.tags ? JSON.parse(r.tags) : [],
      remote: !!r.remote, urgent: !!r.urgent, postedAt: r.posted_at
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ─────────────────────────────────────────────
   SAVED JOBS ROUTES
───────────────────────────────────────────── */
// 🔧 TiDB: GET saved job IDs for a user from saved_jobs table
app.get("/api/saved/:userId", async (req, res) => {
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

// 🔧 TiDB: POST — insert a row into saved_jobs table
app.post("/api/saved", async (req, res) => {
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

// 🔧 TiDB: DELETE — remove a row from saved_jobs table
app.delete("/api/saved/:userId/:jobId", async (req, res) => {
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

/* ─────────────────────────────────────────────
   APPLICATIONS ROUTES
───────────────────────────────────────────── */
// 🔧 TiDB: GET applications for a seeker from applications table
app.get("/api/applications/:userId", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM applications WHERE user_id = ? ORDER BY applied_at DESC",
      [req.params.userId]
    );
    res.json(rows.map(r => ({
      id: r.id, jobId: r.job_id, userId: r.user_id,
      seekerName: r.seeker_name, appliedAt: r.applied_at, status: r.status
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔧 TiDB: GET applications for all jobs posted by an employer
app.get("/api/applications/employer/:uid", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT a.* FROM applications a
       JOIN jobs j ON a.job_id = j.id
       WHERE j.posted_by = ? ORDER BY a.applied_at DESC`,
      [req.params.uid]
    );
    res.json(rows.map(r => ({
      id: r.id, jobId: r.job_id, userId: r.user_id,
      seekerName: r.seeker_name, seekerTitle: r.seeker_title,
      appliedAt: r.applied_at, status: r.status
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔧 TiDB: GET — check if a user has applied to a specific job
app.get("/api/applications/check/:userId/:jobId", async (req, res) => {
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

// 🔧 TiDB: POST — insert a new application row into TiDB
app.post("/api/applications", async (req, res) => {
  try {
    const a = req.body;
    await db.query(
      `INSERT IGNORE INTO applications (job_id, user_id, seeker_name, seeker_title, applied_at, status)
       VALUES (?,?,?,?,?,?)`,
      [a.jobId, a.userId, a.seekerName||"", a.seekerTitle||"", a.appliedAt||Date.now(), a.status||"Reviewing"]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔧 TiDB: PUT — update application status column in TiDB
app.put("/api/applications/:id/status", async (req, res) => {
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

/* ─────────────────────────────────────────────
   USERS / PROFILES ROUTES
───────────────────────────────────────────── */
// 🔧 TiDB: GET user profile from TiDB users table
app.get("/api/users/:uid", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM users WHERE uid = ?", [req.params.uid]);
    if (!rows.length) return res.json(null);
    const u = rows[0];
    res.json({
      id: u.uid, name: u.name, email: u.email, role: u.role,
      avatar: u.avatar, title: u.title, bio: u.bio,
      skills: u.skills ? JSON.parse(u.skills) : [],
      experience: u.experience ? JSON.parse(u.experience) : [],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔧 TiDB: POST — upsert user profile into TiDB users table
//  Called on signup and profile edit
app.post("/api/users", async (req, res) => {
  try {
    const u = req.body;
    await db.query(
      `INSERT INTO users (uid, name, email, role, avatar, title, bio, skills, experience, joined_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE
         name=VALUES(name), email=VALUES(email), role=VALUES(role),
         avatar=VALUES(avatar), title=VALUES(title), bio=VALUES(bio),
         skills=VALUES(skills), experience=VALUES(experience), updated_at=VALUES(updated_at)`,
      [
        u.id||u.uid, u.name||"", u.email||"", u.role||"seeker",
        u.avatar||"", u.title||"", u.bio||"",
        JSON.stringify(u.skills||[]), JSON.stringify(u.experience||[]),
        u.joinedAt||Date.now(), Date.now()
      ]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ─────────────────────────────────────────────
   HELPER
───────────────────────────────────────────── */
function timeAgo(ts) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "Just now";
  if (m < 60) return m + "m ago";
  const h = Math.floor(m / 60);
  if (h < 24) return h + "h ago";
  const d = Math.floor(h / 24);
  return d + "d ago";
}

/* ─────────────────────────────────────────────
   START
───────────────────────────────────────────── */
const PORT = process.env.PORT || 5000;
app.listen(PORT, function() {
  console.log("TalentBridge server running on port " + PORT);
  console.log("TiDB host:", process.env.DB_HOST);
});
