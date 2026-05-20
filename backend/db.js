require("dotenv").config();
const mysql = require("mysql2");

const pool = mysql.createPool({
  host:               process.env.DB_HOST,
  port:               parseInt(process.env.DB_PORT) || 4000,
  user:               process.env.DB_USER,
  password:           process.env.DB_PASS,
  database:           process.env.DB_NAME,
  charset:            "utf8mb4",
  timezone:           "+00:00",
  ssl:                { rejectUnauthorized: false },
  waitForConnections: true,
  connectionLimit:    5,
  connectTimeout:     30000,
  acquireTimeout:     30000,
});

pool.getConnection((err, conn) => {
  if (err) { console.error("❌ DB connection failed:", err.message); return; }
  console.log("✅ TiDB connected successfully!");
  conn.release();
});

module.exports = pool.promise();
