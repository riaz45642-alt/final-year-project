# TalentBridge — Fix Report & Deployment Guide

---

## ❌ Root Causes Found + ✅ Exact Fixes Applied

---

### 1. 🚨 DB Connection Failure — Root Cause

**Problem A — Placeholder password in `.env`:**
```
DB_PASS=YAHAN_APNA_REAL_PASSWORD_LIKHO   ← this is NOT a real password
```
The `.env` file was committed with a placeholder. TiDB rejects it with `Access denied`.

**Problem B — Missing env var validation:**
The old `db.js` would silently pass `undefined` as the password, making the error cryptic.

**✅ Fix applied in `db.js`:**
- Added startup validation — server now logs exactly which env var is missing and exits cleanly.
- Added actionable hint messages for `Access denied` vs `ECONNREFUSED` errors.
- SSL config: `minVersion: "TLSv1.2"` added (TiDB Cloud requirement).

**✅ What YOU must do:**
1. Go to **TiDB Cloud → your cluster → Connect button (top-right)**
2. Choose connection type: **General**
3. Copy the **exact** password shown (it was auto-generated)
4. Put it in `.env`:
   ```
   DB_PASS=yourRealPasswordHere
   ```
5. In **TiDB Cloud → Security → IP Access List** → Add rule: `0.0.0.0/0` (Allow All)

---

### 2. 🚨 Port Conflict (EADDRINUSE 8080) — Root Cause

**Problem:** `.env` had `PORT=8080`. Running `npm run dev` with nodemon while another process already holds 8080 crashes immediately. Also, nodemon restarts can briefly overlap causing double-bind.

**✅ Fix applied in `server.js`:**
```js
server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    startServer(port + 1);  // auto-retries on next port
  }
});
```
- Changed default dev port to **5000** (avoids macOS AirPlay on 5000 and common conflicts on 8080).
- Railway sets `PORT` automatically — you must NOT set `PORT` in Railway's Variables panel.

**✅ Kill existing processes (run this once locally):**
```bash
# macOS / Linux
pkill -f "node server.js"
# or find the PID
lsof -i :8080
kill -9 <PID>

# Windows
netstat -ano | findstr :8080
taskkill /PID <PID> /F
```

---

### 3. 🚨 CORS Errors — Root Cause

**Problem:** `FRONTEND_URL` was never set in `.env`, so `allowedOrigins` only had localhost entries. Netlify requests were blocked.

Also: preflight `OPTIONS` requests were not explicitly handled — some browsers send OPTIONS before the real request, and without `app.options("*", cors(...))` they fail.

**✅ Fix applied in `server.js`:**
```js
app.options("*", cors(corsOptions));   // ← handles preflight BEFORE routes
app.use(cors(corsOptions));
```
And in `.env`:
```
FRONTEND_URL=https://YOUR-SITE-NAME.netlify.app
```

**✅ What YOU must do:**
Set `FRONTEND_URL` in two places:
1. **Local `.env`** → your Netlify URL
2. **Railway dashboard → Variables** → same key + value

---

### 4. 🚨 Frontend API Base URL — Root Cause

**Problem:** The project had **three conflicting config files**:
- `frontend/js/config.js` → pointed to a Render URL (Render is not used)
- `backend/config.js` → pointed to Fly.io (Fly.io is not used)  
- `backend/frontend-config.js` → pointed to Railway but was never loaded by HTML pages

**✅ Fix applied:**
- `frontend/js/config.js` is now the **single source of truth**
- Auto-switches: `localhost:5000` (dev) ↔ Railway HTTPS URL (prod)
- Delete `backend/config.js` and `backend/frontend-config.js` — they are orphaned

**✅ What YOU must do:**
Open `frontend/js/config.js` and replace:
```js
var RAILWAY_DOMAIN = "YOUR-APP-NAME.up.railway.app";
```
with your actual Railway domain, e.g.:
```js
var RAILWAY_DOMAIN = "talentbridge-production.up.railway.app";
```

---

### 5. 🚨 Package.json Not Found — Root Cause

**Problem:** Running `npm install` from the **project root** (where there's no `package.json`) instead of from inside `/backend/`.

**✅ Fix:** Always run npm commands from inside the `backend/` folder:
```bash
cd backend
npm install
npm run dev
```

---

## 🚀 Complete Deployment Checklist

### Step 1 — Fix TiDB credentials (LOCAL)
```bash
# Open backend/.env and fill in:
DB_PASS=<your real TiDB password>
FRONTEND_URL=https://<your-netlify-site>.netlify.app
```

### Step 2 — Test DB locally
```bash
cd backend
npm install
npm run dev
# Open browser: http://localhost:5000/api/test
# Should return: {"success":true,"message":"Database connected successfully."}
```

### Step 3 — Push backend to Railway
```bash
# Option A: Railway CLI
npm install -g @railway/cli
railway login
cd backend
railway init          # creates project
railway up            # deploys

# Option B: GitHub
# Push the backend/ folder contents to a GitHub repo
# Connect repo in Railway dashboard → Deploy
```

### Step 4 — Set Railway environment variables
In Railway dashboard → your service → Variables, add:
```
DB_HOST     = gateway01.ap-northeast-1.prod.aws.tidbcloud.com
DB_PORT     = 4000
DB_USER     = 2Kz7qwuDcxMRtqr.root
DB_PASS     = <your real password>
DB_NAME     = fyp-db
NODE_ENV    = production
FRONTEND_URL = https://<your-netlify-site>.netlify.app
```
⚠️ Do NOT add `PORT` — Railway sets it automatically.

### Step 5 — Get your Railway URL
Railway dashboard → your service → Settings → Domains
Copy the domain, e.g. `talentbridge-production.up.railway.app`

### Step 6 — Update frontend config
Open `frontend/js/config.js`:
```js
var RAILWAY_DOMAIN = "talentbridge-production.up.railway.app";
```

### Step 7 — Initialize database tables (ONE TIME)
After Railway deploy succeeds, visit:
```
https://talentbridge-production.up.railway.app/api/setup
```
You should see: `{"success":true,"message":"All tables created & migrated successfully."}`

### Step 8 — Deploy frontend to Netlify
Drag-and-drop the `frontend/` folder to Netlify, or connect your GitHub repo.
Make sure `frontend/_redirects` is present (it already is):
```
/*    /index.html   200
```

---

## 📁 Files Changed Summary

| File | Change |
|------|--------|
| `backend/db.js` | Added env var validation, better SSL, actionable error hints |
| `backend/server.js` | Port conflict fallback, preflight CORS, cleaner structure |
| `backend/.env` | Fixed placeholder password with clear instructions |
| `backend/package.json` | Kept same — confirmed correct |
| `backend/railway.toml` | **NEW** — Railway deployment config |
| `frontend/js/config.js` | Points to Railway (replaces Render/Fly.io confusion) |

## 🗑️ Files to Delete (orphaned/confusing)
- `backend/config.js` ← delete
- `backend/frontend-config.js` ← delete

---

## 🧪 Quick Smoke Test After Deploy

```
GET  https://<railway-url>/              → {"status":"TalentBridge API running ✅"}
GET  https://<railway-url>/api/test     → {"success":true}
GET  https://<railway-url>/api/jobs     → [] (empty array is correct before data entry)
```

If `/api/test` fails → DB credentials or TiDB IP whitelist issue.  
If `/` fails → Railway deploy didn't complete — check Railway logs.
