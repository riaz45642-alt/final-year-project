/**
 * Database connection pool (TiDB Cloud via mysql2)
 *
 * Reads credentials from the .env file.
 * Export is a promise-based pool — use `await db.query(...)` everywhere.
 */

const mysql = require("mysql2");
require("dotenv").config();

const pool = mysql.createPool({
  host:     process.env.DB_HOST,
  port:     parseInt(process.env.DB_PORT) || 3306,
  user:     process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  charset:  "utf8mb4",
  timezone: "+00:00",
});

module.exports = pool.promise();
