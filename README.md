# TalentBridge — Setup Guide

## Stack
- **Frontend**: Plain HTML/CSS/JS (no build step needed)
- **Auth**: Firebase Authentication (email + Google)
- **Database**: TiDB Cloud (MySQL-compatible, serverless)
- **Backend**: Node.js + Express (runs separately)

---

## Step 1 — Create TiDB Tables

1. Start the backend:
   ```bash
   cd database
   npm install
   node server.js
   ```
2. Open your browser and visit once:
   ```
   http://localhost:5000/api/setup
   ```
   This creates all 4 tables (users, jobs, saved_jobs, applications) in your TiDB database.

---

## Step 2 — Test the Connection

Visit:
```
http://localhost:5000/api/test
```
You should see: `{ "success": true, "message": "TiDB connected successfully" }`

---

## Step 3 — Open the Frontend

Open `frontend/landing.html` in your browser (or serve with Live Server in VS Code).

---

## Step 4 — Deploy (Optional)

### Backend (Render / Railway)
1. Push the `database/` folder to GitHub
2. Create a new Web Service on [Render](https://render.com)
3. Set environment variables: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS`, `DB_NAME`
4. After deploy, copy your backend URL (e.g. `https://talentbridge-api.onrender.com`)

### Frontend
5. Open `js/script.js` and change line 9:
   ```js
   const API_BASE = "https://talentbridge-api.onrender.com/api";
   ```
6. Deploy the `frontend/` + `js/` + `css/` folders to [Netlify](https://netlify.com) (drag & drop)

---

## Firebase Setup (already done in auth.js)
- Auth is configured in `js/auth.js` with your existing Firebase project (`talent-bridge1`)
- On every login, the user profile is automatically upserted into TiDB

---

## What Changed from the Previous Version
| Before | After |
|--------|-------|
| localStorage for jobs, apps, saved | TiDB Cloud (persistent) |
| localStorage for auth session | Firebase Auth (real) |
| MongoDB references | Removed completely |
| Broken script paths (3 pages) | Fixed |
| Empty job feed | Jobs now come from TiDB |

