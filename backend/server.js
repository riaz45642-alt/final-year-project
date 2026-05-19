console.log("Server starting…");
const express = require("express");
const cors    = require("cors");
require("dotenv").config();

const app = express();

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (origin.endsWith(".netlify.app")) return callback(null, true);
    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));

app.use(express.json());
app.get("/", (req, res) => res.json({ status: "TalentBridge API running ✅" }));

app.use("/api",              require("./routes/setup"));
app.use("/api/jobs",         require("./routes/jobs"));
app.use("/api/saved",        require("./routes/savedJobs"));
app.use("/api/applications", require("./routes/applications"));
app.use("/api/users",        require("./routes/users"));
app.use("/api/cv",           require("./routes/cv"));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`TalentBridge running on port ${PORT}`));