// 🔧 TiDB: mysql2 connection pool — connects to TiDB Cloud via .env credentials
// MongoDB has been removed. All data is stored in TiDB Cloud (MySQL-compatible).
const mysql = require("mysql2");
require("dotenv").config();

// 🔧 TiDB: connection pool using credentials from .env file
//    DB_HOST, DB_PORT, DB_USER, DB_PASS, DB_NAME  →  set in database/.env
const pool = mysql.createPool({
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT,
  user:     process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: true }, // required for TiDB Cloud
});

module.exports = pool.promise();
