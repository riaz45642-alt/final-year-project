/**
 * Setup & Health Routes
 *
 *  GET /api/setup   — Creates all database tables (run once on first deploy)
 *  GET /api/test    — Pings the database to verify the connection is alive
 */

const express = require("express");
const router  = express.Router();
const db      = require("../db");

// ── Create all tables (run once on first deploy) ──────────────────────────────
router.get("/setup", async (req, res) => {
  try {
    // Users — Firebase UID is the primary key
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        uid         VARCHAR(128) PRIMARY KEY,
        name        VARCHAR(255),
        email       VARCHAR(255),
        role        VARCHAR(20)  DEFAULT 'seeker',
        avatar      VARCHAR(10),
        title       VARCHAR(255),
        location    VARCHAR(255),
        bio         TEXT,
        skills      TEXT,
        experience  TEXT,
        education   TEXT,
        phone       VARCHAR(30),
        website     VARCHAR(255),
        linkedin    VARCHAR(255),
        github      VARCHAR(255),
        joined_at   BIGINT,
        updated_at  BIGINT
      )
    `);

    // Jobs — listings posted by employers
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

    // Saved jobs — many-to-many: users <-> jobs
    await db.query(`
      CREATE TABLE IF NOT EXISTS saved_jobs (
        id          BIGINT AUTO_INCREMENT PRIMARY KEY,
        user_id     VARCHAR(128) NOT NULL,
        job_id      VARCHAR(64)  NOT NULL,
        saved_at    BIGINT,
        UNIQUE KEY unique_save (user_id, job_id)
      )
    `);

    // Applications — job applications submitted by seekers
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

    // CV Data — full CV details stored per user
    await db.query(`
      CREATE TABLE IF NOT EXISTS cv_data (
        user_id           VARCHAR(128) PRIMARY KEY,
        first_name        VARCHAR(100),
        last_name         VARCHAR(100),
        job_title         VARCHAR(150),
        email             VARCHAR(255),
        phone             VARCHAR(30),
        location          VARCHAR(100),
        summary           TEXT,
        skills            TEXT,
        education         TEXT,
        experience        TEXT,
        selected_template VARCHAR(20) DEFAULT 'blue',
        last_updated      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(uid) ON DELETE CASCADE
      )
    `);

    // ── Migrations: add new columns if they don't exist ──
    const migrations = [
      { col: "location",  sql: "ALTER TABLE users ADD COLUMN location VARCHAR(255) DEFAULT ''" },
      { col: "education", sql: "ALTER TABLE users ADD COLUMN education TEXT" },
      { col: "phone",     sql: "ALTER TABLE users ADD COLUMN phone VARCHAR(30)" },
      { col: "website",   sql: "ALTER TABLE users ADD COLUMN website VARCHAR(255)" },
      { col: "linkedin",  sql: "ALTER TABLE users ADD COLUMN linkedin VARCHAR(255)" },
      { col: "github",    sql: "ALTER TABLE users ADD COLUMN github VARCHAR(255)" },
    ];

    for (const m of migrations) {
      try { await db.query(m.sql); }
      catch (e) { if (!e.message.includes("Duplicate column")) throw e; }
    }

    res.json({ success: true, message: "All tables created & migrated successfully." });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Ping the database ─────────────────────────────────────────────────────────
router.get("/test", async (req, res) => {
  try {
    await db.query("SELECT 1");
    res.json({ success: true, message: "Database connected successfully." });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
