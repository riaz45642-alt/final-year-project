const mysql = require("mysql2");
require("dotenv").config();

const pool = mysql.createPool({
  host:               process.env.DB_HOST,
  port:               parseInt(process.env.DB_PORT) || 3306,
  user:               process.env.DB_USER,
  password:           process.env.DB_PASS,
  database:           process.env.DB_NAME,
  charset:            "utf8mb4",
  timezone:           "+00:00",
  ssl:                { rejectUnauthorized: false },
  waitForConnections: true,
  connectionLimit:    5,
  connectTimeout:     20000,
});

pool.getConnection((err, conn) => {
  if (err) { console.error("❌ DB connection failed:", err.message); }
  else { console.log("✅ DB connected"); conn.release(); }
});

module.exports = pool.promise();