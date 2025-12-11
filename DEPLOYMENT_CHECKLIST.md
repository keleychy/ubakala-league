# ⚡ Quick Deployment Checklist for Render

Complete this checklist step-by-step to deploy your Ubakala League application to Render.

---

## ✅ PRE-DEPLOYMENT (Local Machine)

### 1. Environment Setup
- [ ] Python virtual environment created: `python -m venv venv`
- [ ] Virtual environment activated: `venv\Scripts\activate` (Windows) or `source venv/bin/activate` (Mac/Linux)
- [ ] Dependencies installed: `pip install -r requirements.txt`
- [ ] `.env` file created (copy from `.env.example`)

### 2. Django Configuration
- [ ] `backend/settings.py` updated with production settings (see `SETTINGS_PRODUCTION_GUIDE.md`)
- [ ] `DEBUG = False` in production env var
- [ ] `SECRET_KEY` generated and added to `.env`
- [ ] `ALLOWED_HOSTS` updated with your domain
- [ ] `CORS_ALLOWED_ORIGINS` updated with frontend URL

### 3. Requirements & Configuration Files
- [ ] `requirements.txt` exists in root directory
- [ ] `Procfile` exists in root directory (for gunicorn startup)
- [ ] `build.sh` exists in root directory (for build process)
- [ ] `.gitignore` created (includes `venv/`, `*.pyc`, `.env`, etc.)

### 4. Frontend Configuration
- [ ] `frontend/.env.production` created with `REACT_APP_API_URL`
- [ ] Frontend build test: `cd frontend && npm run build` (succeeds without errors)
- [ ] `frontend/.gitignore` updated with `node_modules/`, `build/`, `.env`

### 5. Local Testing
- [ ] Backend runs locally: `python manage.py runserver`
- [ ] Frontend runs locally: `npm start` (from `frontend/` directory)
- [ ] API calls work: test `/api/` endpoint in browser
- [ ] CORS works: no console errors when frontend calls backend

### 6. Git Preparation
- [ ] All changes committed: `git add . && git commit -m "Initial commit"`
- [ ] GitHub repository created
- [ ] Code pushed to GitHub: `git push -u origin main`
- [ ] `.env` file NOT committed (should be in `.gitignore`)

---

## ✅ DATABASE SETUP (Choose ONE)

### Option A: Neon (Recommended)
- [ ] Account created at [neon.tech](https://neon.tech)
- [ ] Project created
- [ ] Database created
- [ ] Connection string copied
- [ ] Extract from connection string:
  - [ ] Host: `xxxxx.neon.tech`
  - [ ] Database name: `neon_dbname`
  - [ ] User: `neon_user`
  - [ ] Password: `neon_password`

### Option B: Supabase
- [ ] Account created at [supabase.com](https://supabase.com)
- [ ] Project created with PostgreSQL
- [ ] Connection string copied from Settings → Databases
- [ ] Extract connection details

### Option C: ElephantSQL
- [ ] Account created at [elephantsql.com](https://www.elephantsql.com/)
- [ ] PostgreSQL instance created (free tier)
- [ ] Connection string copied
- [ ] Extract connection details

---

## ✅ RENDER DEPLOYMENT

### Step 1: Create Render Account
- [ ] Account created at [render.com](https://render.com)
- [ ] Signed in with GitHub
- [ ] GitHub repository connected

### Step 2: Deploy Backend Service
- [ ] Go to Render Dashboard
- [ ] Click "New +" → "Web Service"
- [ ] Connect GitHub repository
- [ ] Configure:
  - [ ] Name: `ubakala-backend`
  - [ ] Branch: `main`
  - [ ] Build Command: `bash build.sh`
  - [ ] Start Command: `gunicorn backend.wsgi:application`
  - [ ] Runtime: `Python 3.11`
  - [ ] Plan: **Free**
- [ ] Environment Variables added:
  - [ ] `DEBUG=False`
  - [ ] `SECRET_KEY=your-generated-secret-key`
  - [ ] `DB_NAME=your_db_name`
  - [ ] `DB_USER=your_db_user`
  - [ ] `DB_PASSWORD=your_db_password`
  - [ ] `DB_HOST=your.db.host.com`
  - [ ] `DB_PORT=5432`
  - [ ] `FRONTEND_URL=https://ubakala-frontend.onrender.com`
  - [ ] `RENDER_EXTERNAL_HOSTNAME=ubakala-backend.onrender.com`
- [ ] Web Service created
- [ ] Deployment logs checked (should see "deployed successfully")
- [ ] Backend URL accessible: `https://ubakala-backend.onrender.com/api/`

### Step 3: Deploy Frontend Service
- [ ] Go to Render Dashboard
- [ ] Click "New +" → "Static Site"
- [ ] Connect GitHub repository (same one)
- [ ] Configure:
  - [ ] Name: `ubakala-frontend`
  - [ ] Branch: `main`
  - [ ] Build Command: `cd frontend && npm install && npm run build`
  - [ ] Publish Directory: `frontend/build`
- [ ] Environment Variables (optional):
  - [ ] `REACT_APP_API_URL=https://ubakala-backend.onrender.com/api`
- [ ] Static Site created
- [ ] Deployment logs checked
- [ ] Frontend URL accessible: `https://ubakala-frontend.onrender.com`

### Step 4: Verify Deployments
- [ ] Backend service shows "Live"
- [ ] Frontend service shows "Live"
- [ ] No errors in deployment logs
- [ ] API endpoint returns data (test in browser or Postman)

---

## ✅ TESTING & VERIFICATION

### Backend Tests
- [ ] Visit `https://ubakala-backend.onrender.com/api/` → returns JSON
- [ ] Visit `https://ubakala-backend.onrender.com/admin/` → Django admin loads
- [ ] Database migrations completed (check logs for "Ran X migration")
- [ ] API endpoints work (e.g., `/api/matches/`, `/api/seasons/`)

### Frontend Tests
- [ ] Frontend loads without blank page
- [ ] No console errors (open DevTools → F12 → Console)
- [ ] API calls reach backend (DevTools → Network tab)
- [ ] Pages load correctly:
  - [ ] Home page
  - [ ] Results page
  - [ ] Standings page
  - [ ] Bracket page
  - [ ] Admin dashboard (if applicable)

### Integration Tests
- [ ] Frontend can fetch matches from backend
- [ ] Results page displays live scores
- [ ] Bracket shows connections correctly
- [ ] User authentication works (if applicable)
- [ ] Admin can create/edit matches

---

## ✅ DOMAIN & DNS (Optional)

### If Using Custom Domain

#### Buy Domain
- [ ] Domain purchased (GoDaddy, Namecheap, etc.)
- [ ] Domain registrar access ready

#### Configure Render Backend Domain
- [ ] In Render → Backend Service → Settings
- [ ] Add Custom Domain: `api.yourdomain.com`
- [ ] Copy the CNAME value from Render

#### Configure Render Frontend Domain
- [ ] In Render → Frontend Service → Settings
- [ ] Add Custom Domain: `yourdomain.com` or `www.yourdomain.com`
- [ ] Copy the CNAME value from Render

#### Update DNS (Registrar)
- [ ] Log in to domain registrar
- [ ] Add CNAME record for backend:
  ```
  Name: api
  Value: ubakala-backend.onrender.com (from Render)
  ```
- [ ] Add CNAME record for frontend:
  ```
  Name: www (or @)
  Value: ubakala-frontend.onrender.com (from Render)
  ```
- [ ] Wait 15-30 minutes for DNS propagation
- [ ] Verify with: `nslookup api.yourdomain.com` and `nslookup www.yourdomain.com`

#### Update Backend Settings
- [ ] Update `ALLOWED_HOSTS` in `backend/settings.py`:
  ```python
  ALLOWED_HOSTS = [..., 'api.yourdomain.com', 'yourdomain.com']
  ```
- [ ] Update `CORS_ALLOWED_ORIGINS`:
  ```python
  CORS_ALLOWED_ORIGINS = [..., 'https://yourdomain.com', 'https://www.yourdomain.com']
  ```
- [ ] Commit changes: `git push`
- [ ] Render auto-redeploys backend
- [ ] Test custom domain works

---

## ✅ MAINTENANCE & MONITORING

### Ongoing Tasks
- [ ] Check Render dashboard weekly for errors
- [ ] Monitor backend logs for exceptions
- [ ] Set up email alerts on Render (if available)
- [ ] Backup database regularly (if needed)
- [ ] Update dependencies periodically

### If Something Breaks
- [ ] Check recent deployments (might be a bad commit)
- [ ] Review logs in Render dashboard
- [ ] Test locally first before pushing fix
- [ ] Roll back to previous commit if needed: `git revert <commit-hash>`

### Performance Tips
- [ ] Consider upgrading from free tier if app gets slow
- [ ] Use CDN for static assets (optional)
- [ ] Optimize database queries
- [ ] Monitor database size (free tier has limits)

---

## ✅ POST-DEPLOYMENT CHECKLIST

- [ ] Application is live and accessible
- [ ] All team members have access to Render dashboard
- [ ] Documentation updated with live URLs
- [ ] Backups configured (if needed)
- [ ] Security settings reviewed
- [ ] Performance acceptable (no timeout errors)
- [ ] Email notifications configured (for errors)
- [ ] Database backup plan documented
- [ ] Team trained on deployment process

---

## 📞 Troubleshooting

| Issue | Solution |
|-------|----------|
| Backend won't start | Check logs in Render → check env vars → verify database connection |
| Frontend blank page | Check browser console for errors → check API URL in `.env.production` |
| CORS errors | Update `CORS_ALLOWED_ORIGINS` in `settings.py` → redeploy |
| Static files not loading | Ensure `build.sh` runs successfully → check `STATIC_ROOT` setting |
| Database connection failed | Verify `DB_*` env vars → test connection locally → check database status |
| Slow response times | Free tier may spin down → upgrade to paid tier → optimize queries |

---

## 🎉 You're Done!

Your Ubakala League application is now live on Render!

**Backend URL:** `https://ubakala-backend.onrender.com`
**Frontend URL:** `https://ubakala-frontend.onrender.com`
**Custom Domain:** `https://yourdomain.com` (if configured)

---

## Need Help?

- 📖 [Render Documentation](https://render.com/docs)
- 🐍 [Django Deployment Guide](https://docs.djangoproject.com/en/6.0/howto/deployment/)
- ⚛️ [React Production Build](https://create-react-app.dev/docs/production-build/)
- 🗄️ [PostgreSQL Setup](https://www.postgresql.org/docs/)

