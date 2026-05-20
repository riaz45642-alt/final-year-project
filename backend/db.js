require("dotenv").config();
const mysql = require("mysql2");

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,

  ssl: {
    rejectUnauthorized: false
  },

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test connection
pool.getConnection((err, conn) => {
  if (err) {
    console.error("❌ DB connection failed:", err.message);
    return;
  }
  console.log("✅ TiDB connected successfully!");
  conn.release();
});

module.exports = pool.promise();