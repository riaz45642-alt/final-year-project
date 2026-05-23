# TalentBridge — Deployment Guide
## Stack: Cloudflare Pages (frontend) + Render (backend) + TiDB Cloud (database)

---

## Prerequisites
- GitHub account (push both frontend and backend)
- Cloudflare account (free tier works)
- Render account (free tier works)
- TiDB Cloud cluster already set up with credentials

---

## Part 1 — Backend: Deploy to Render

### Step 1 — Prepare your GitHub repo
Push the `backend/` folder contents to a GitHub repository (e.g. `talentbridge-backend`).
Make sure `.env` is in `.gitignore` (it already is).

### Step 2 — Create Web Service on Render
1. Go to [render.com](https://render.com) → **New** → **Web Service**
2. Connect your GitHub account and select your backend repo
3. Fill in:
   - **Name**: `talentbridge-api` (or any name)
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Instance Type**: Free

### Step 3 — Set Environment Variables on Render
In Render dashboard → your service → **Environment** tab → Add these:

| Key | Value |
|-----|-------|
| `DB_HOST` | `gateway01.ap-northeast-1.prod.aws.tidbcloud.com` |
| `DB_PORT` | `4000` |
| `DB_USER` | your TiDB username |
| `DB_PASS` | your TiDB password |
| `DB_NAME` | `fyp-db` |
| `NODE_ENV` | `production` |
| `FRONTEND_URL` | `https://your-project.pages.dev` ← update after Step 7 |

⚠️ Do NOT set `PORT` — Render injects it automatically.

### Step 4 — Deploy & get your Render URL
Click **Deploy**. Wait for build to finish.
Your URL will be: `https://talentbridge-api.onrender.com` (or similar — check the top of the service page).

### Step 5 — Initialize database tables (ONE TIME)
Visit in your browser:
```
https://YOUR-RENDER-URL.onrender.com/api/setup
```
Expected response: `{"success":true,"message":"All tables created & migrated successfully."}`

### Step 6 — Smoke test the API
```
GET https://YOUR-RENDER-URL.onrender.com/          → {"status":"TalentBridge API running ✅"}
GET https://YOUR-RENDER-URL.onrender.com/api/jobs  → [] (empty array is correct)
```

---

## Part 2 — Frontend: Update API URL

### Step 7 — Edit frontend/js/config.js
Open `frontend/js/config.js` and replace:
```js
var RENDER_DOMAIN = "YOUR-SERVICE-NAME.onrender.com";
```
with your actual Render domain, e.g.:
```js
var RENDER_DOMAIN = "talentbridge-api.onrender.com";
```

---

## Part 3 — Frontend: Deploy to Cloudflare Pages

### Step 8 — Push frontend to GitHub
Push the `frontend/` folder contents to a GitHub repository (e.g. `talentbridge-frontend`).
Make sure `_redirects` and `_headers` are included (they already are).

### Step 9 — Create Pages project on Cloudflare
1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages**
2. Choose **Connect to Git** → select your frontend repo
3. Fill in build settings:
   - **Framework preset**: `None`
   - **Build command**: *(leave empty)*
   - **Build output directory**: `/` (or leave as default — the repo root IS the frontend)
4. Click **Save and Deploy**

### Step 10 — Get your Cloudflare Pages URL
After deploy completes, Cloudflare assigns: `https://your-project.pages.dev`

### Step 11 — Update FRONTEND_URL on Render
Go back to Render → your service → **Environment** → update:
```
FRONTEND_URL = https://your-project.pages.dev
```
Then trigger a **Manual Deploy** on Render so the new CORS setting takes effect.

---

## Part 4 — Local Development

```bash
# Terminal 1 — Backend
cd backend
npm install
npm run dev
# API runs at http://localhost:8080

# Terminal 2 — Frontend
# Open frontend/index.html directly in browser, or use Live Server (VS Code extension)
# config.js auto-detects localhost and points to http://localhost:8080/api
```

---

## File Reference

| File | Purpose |
|------|---------|
| `frontend/_redirects` | Cloudflare Pages URL routing |
| `frontend/_headers` | Cloudflare Pages security headers + cache rules |
| `frontend/js/config.js` | API base URL (auto-switches local ↔ production) |
| `backend/render.yaml` | Render blueprint spec |
| `backend/server.js` | Express app with CORS + all routes |
| `backend/.env.example` | Environment variable template |

---

## Environment Variables Summary

### Render (backend)
```
DB_HOST=gateway01.ap-northeast-1.prod.aws.tidbcloud.com
DB_PORT=4000
DB_USER=<your_tidb_user>
DB_PASS=<your_tidb_password>
DB_NAME=fyp-db
NODE_ENV=production
FRONTEND_URL=https://your-project.pages.dev
```

### Local backend (.env)
```
DB_HOST=gateway01.ap-northeast-1.prod.aws.tidbcloud.com
DB_PORT=4000
DB_USER=<your_tidb_user>
DB_PASS=<your_tidb_password>
DB_NAME=fyp-db
PORT=8080
NODE_ENV=development
FRONTEND_URL=http://localhost:5500
```

---

## TiDB Cloud — Required Setting
In **TiDB Cloud → Security → IP Access List**, add:
```
0.0.0.0/0   Allow All (required for Render's dynamic IPs)
```
