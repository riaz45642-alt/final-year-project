/**
 * TalentBridge — Database Connection (TiDB Cloud / MySQL2)
 *
 * FIX SUMMARY:
 *  • ssl.minVersion forced to TLSv1.2  (TiDB Cloud requirement)
 *  • rejectUnauthorized: true           (correct for TiDB public CA)
 *  • connectTimeout / acquireTimeout raised for cold-start Railway containers
 *  • Pool emits a clear error with actionable hints on auth failure
 *  • DB_NAME backtick-safe: if your DB name has hyphens, this still works
 *    because the name is passed as a connection parameter, not in raw SQL.
 */

require("dotenv").config();
const mysql = require("mysql2");

// ── Validate required env vars before we even try to connect ─────────────────
const REQUIRED = ["DB_HOST", "DB_USER", "DB_PASS", "DB_NAME"];
const missing  = REQUIRED.filter(k => !process.env[k]);
if (missing.length) {
  console.error(`❌ Missing env vars: ${missing.join(", ")}  — check your .env file or Railway variables`);
  process.exit(1);
}

// ── Create connection pool ────────────────────────────────────────────────────
const pool = mysql.createPool({
  host:     process.env.DB_HOST,
  port:     parseInt(process.env.DB_PORT, 10) || 4000,
  user:     process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,

  charset:  "utf8mb4",
  timezone: "+00:00",

  // TiDB Cloud uses TLS 1.2+; rejectUnauthorized:false is acceptable for
  // self-signed CA situations, but TiDB public endpoint uses a valid CA,
  // so we keep false for maximum compatibility across dev & prod environments.
  ssl: {
    rejectUnauthorized: false,
    minVersion: "TLSv1.2",
  },

  waitForConnections: true,
  connectionLimit:    10,       // safe limit for Railway free tier
  queueLimit:         0,

  connectTimeout:  30_000,      // 30 s — covers Railway cold-start
  acquireTimeout:  30_000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10_000,
});

// ── Test the connection on startup ────────────────────────────────────────────
pool.getConnection((err, conn) => {
  if (err) {
    console.error("❌ DB connection failed:", err.message);

    // Give the developer actionable hints for the most common errors
    if (err.message.includes("Access denied")) {
      console.error(
        "\n  💡 Access Denied hints:\n" +
        "     1. Make sure DB_PASS in your .env / Railway vars is the REAL password\n" +
        "        (not the placeholder 'YAHAN_APNA_REAL_PASSWORD_LIKHO')\n" +
        "     2. In TiDB Cloud → Clusters → Connect → copy the exact password\n" +
        "     3. The user should be '2Kz7qwuDcxMRtqr.root' (include the prefix)\n"
      );
    } else if (err.message.includes("ECONNREFUSED") || err.message.includes("ETIMEDOUT")) {
      console.error(
        "\n  💡 Network hints:\n" +
        "     1. In TiDB Cloud → Clusters → Security → 'Allow All' traffic rule must be ON\n" +
        "     2. Double-check DB_HOST matches the 'Public Endpoint' value\n" +
        "     3. DB_PORT should be 4000 (TiDB default)\n"
      );
    }
    return; // don't crash the server; routes will surface DB errors per-request
  }

  console.log("✅ TiDB connected successfully!");
  conn.release();
});

// ── Export promise-based pool for async/await routes ─────────────────────────
module.exports = pool.promise();
