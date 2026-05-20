console.log("Server starting...");

const express = require("express");
const cors    = require("cors");
require("dotenv").config();

const app = express();

// Open CORS - allow all origins (fine for FYP)
app.use(cors());
app.use(express.json());

// Health check
app.get("/", (req, res) => res.json({ status: "TalentBridge API running ✅" }));

// Routes
app.use("/api",              require("./routes/setup"));
app.use("/api/jobs",         require("./routes/jobs"));
app.use("/api/saved",        require("./routes/savedJobs"));
app.use("/api/applications", require("./routes/applications"));
app.use("/api/users",        require("./routes/users"));
app.use("/api/cv",           require("./routes/cv"));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`TalentBridge running on port ${PORT}`));
