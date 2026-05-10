console.log("1. Server file loaded");

const express = require("express");
const cors = require("cors");
require("dotenv").config();

const db = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/test", async (req, res) => {
  try {
    await db.query("SELECT 1");
    res.json({
      success: true,
      message: "DB connected successfully"
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

console.log("2. About to start server...");

app.listen(5000, () => {
  console.log("Server running on port 5000");
});