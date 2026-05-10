// server.js
// ─────────────────────────────────────────────
// JobPortal — Simple Express Server
// Serves all 9 HTML pages and static assets.
// No database, no authentication, no APIs.
// ─────────────────────────────────────────────

const express = require('express');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Serve static files (style.css, script.js) ─
// Express will automatically serve any file in the
// current directory when the browser requests it.
app.use(express.static(path.join(__dirname)));

// ── Page Routes ───────────────────────────────
// Each route simply sends the corresponding HTML file.

// Home page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Browse Jobs
app.get('/page2', (req, res) => {
  res.sendFile(path.join(__dirname, 'page2.html'));
});

// Saved Jobs
app.get('/page3', (req, res) => {
  res.sendFile(path.join(__dirname, 'page3.html'));
});

// My Applications
app.get('/page4', (req, res) => {
  res.sendFile(path.join(__dirname, 'page4.html'));
});

// AI Assistant
app.get('/page5', (req, res) => {
  res.sendFile(path.join(__dirname, 'page5.html'));
});

// CV Builder
app.get('/page6', (req, res) => {
  res.sendFile(path.join(__dirname, 'page6.html'));
});

// Profile
app.get('/page7', (req, res) => {
  res.sendFile(path.join(__dirname, 'page7.html'));
});

// Employer Hub
app.get('/page8', (req, res) => {
  res.sendFile(path.join(__dirname, 'page8.html'));
});

// Contact
app.get('/page9', (req, res) => {
  res.sendFile(path.join(__dirname, 'page9.html'));
});

// ── 404 Handler ───────────────────────────────
// If no route matches, send a simple 404 message.
app.use((req, res) => {
  res.status(404).send('<h1>404 — Page Not Found</h1><p><a href="/">Go back home</a></p>');
});

// ── Start Server ──────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ JobPortal server running at http://localhost:${PORT}`);
});