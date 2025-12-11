# 🚀 Ubakala League - Render Deployment Roadmap

A complete guide to deploy your Django + React application to Render for free (with free tier limitations).

---

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Step-by-Step Deployment](#step-by-step-deployment)
4. [Backend Deployment (Django API)](#backend-deployment-django-api)
5. [Frontend Deployment (React)](#frontend-deployment-react)
6. [Database Setup](#database-setup)
7. [Domain & DNS Configuration](#domain--dns-configuration)
8. [Environment Variables](#environment-variables)
9. [Troubleshooting](#troubleshooting)
10. [Post-Deployment Checklist](#post-deployment-checklist)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Render Hosting                        │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Frontend (React)            Backend (Django REST API)   │
│  ├─ Static Site              ├─ Web Service             │
│  ├─ Hosted on Render         ├─ Hosted on Render        │
│  ├─ Auto-deployed from Git   ├─ Auto-deployed from Git  │
│  └─ Custom Domain            └─ Custom Domain           │
│                                                           │
│  PostgreSQL Database                                      │
│  ├─ External (e.g., Neon, Render, or ElephantSQL)      │
│  ├─ Free tier available                                  │
│  └─ Configured via env vars                              │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

---

## Prerequisites

### What You Need
1. **GitHub Account** – for version control & auto-deployment
2. **Render Account** – [render.com](https://render.com) (free)
3. **Git Knowledge** – basic push/pull operations
4. **Environment Variables** – secure config management
5. **PostgreSQL Credentials** – from free database provider

### Create Accounts (in order)
1. **GitHub** → Create a repository for your project
2. **Render** → Sign up with GitHub for easy integration
3. **PostgreSQL Provider** → Choose one:
   - **Neon** (free tier: 5GB, recommended for beginners)
   - **ElephantSQL** (free tier ending, but still available)
   - **Render PostgreSQL** (paid but can add to Render account)
   - **Supabase** (free tier with PostgreSQL)

---

## Step-by-Step Deployment

### Phase 1: Local Preparation (Complete BEFORE deploying)

#### 1.1 Create `requirements.txt` for Backend

Your backend needs a `requirements.txt` file listing all Python dependencies.

**File:** `requirements.txt` (root directory)

```
Django==6.0
djangorestframework==3.14.0
django-cors-headers==4.0.0
channels==4.0.0
daphne==4.0.1
psycopg2-binary==2.9.7
python-dotenv==1.0.0
gunicorn==21.2.0
whitenoise==6.5.0
djangorestframework-simplejwt==5.3.2
Pillow==10.0.0
```

**Why?**
- Render needs `requirements.txt` to install dependencies on the server.
- `gunicorn` serves Django in production.
- `psycopg2-binary` connects to PostgreSQL.
- `whitenoise` serves static files efficiently.

#### 1.2 Create Procfile for Backend

**File:** `Procfile` (root directory)

```
web: gunicorn backend.wsgi:application
release: python manage.py migrate
worker: daphne -b 0.0.0.0 -p $PORT backend.asgi:application
```

**Why?**
- Tells Render how to start your Django app.
- `release` command runs migrations automatically on deploy.

#### 1.3 Create Build Script

**File:** `build.sh` (root directory)

```bash
#!/bin/bash
set -o errexit

pip install -r requirements.txt
python manage.py collectstatic --noinput
python manage.py migrate
```

**Why?**
- Automates dependency installation and static file collection on Render.

#### 1.4 Update `backend/settings.py` for Production

Modify your Django settings for Render deployment:

```python
# At the top, add:
import os
from pathlib import Path

# ... existing code ...

# 1. Update DEBUG mode
DEBUG = os.getenv('DEBUG', 'False') == 'True'

# 2. Update ALLOWED_HOSTS
ALLOWED_HOSTS = [
    'localhost',
    '127.0.0.1',
    os.getenv('RENDER_EXTERNAL_HOSTNAME', ''),
    'yourdomain.com',  # Replace with your actual domain
]

# 3. Update database connection to use env vars
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv('DB_NAME'),
        'USER': os.getenv('DB_USER'),
        'PASSWORD': os.getenv('DB_PASSWORD'),
        'HOST': os.getenv('DB_HOST'),
        'PORT': os.getenv('DB_PORT', '5432'),
    }
}

# 4. Update CORS for production
CORS_ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://yourdomain.com',  # Replace with your actual domain
    'https://www.yourdomain.com',
    os.getenv('FRONTEND_URL', ''),
]

# 5. Update SECRET_KEY from environment
SECRET_KEY = os.getenv('SECRET_KEY', 'django-insecure-aw2$6c$gw!##1du0md+_@wfaf^(25e_a+2+d$8ts8)z&p0^9$n')

# 6. Add Security Settings
SECURE_SSL_REDIRECT = not DEBUG
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG
SECURE_HSTS_SECONDS = 31536000 if not DEBUG else 0
SECURE_HSTS_INCLUDE_SUBDOMAINS = not DEBUG
SECURE_HSTS_PRELOAD = not DEBUG

# 7. Static files
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'
```

#### 1.5 Create `.env.example` (Template for Environment Variables)

**File:** `.env.example` (root directory)

```
# Django Settings
DEBUG=False
SECRET_KEY=your-secret-key-here

# Database
DB_NAME=ubakala_db
DB_USER=ubakala_user
DB_PASSWORD=your-secure-password
DB_HOST=your-db-host.render.com
DB_PORT=5432

# Frontend URL (for CORS)
FRONTEND_URL=https://ubakala-frontend.render.com

# Render
RENDER_EXTERNAL_HOSTNAME=ubakala-backend.render.com
```

#### 1.6 Update Frontend for Production

**File:** `frontend/.env.production`

```
REACT_APP_API_URL=https://ubakala-backend.render.com/api
```

**File:** `frontend/src/api/api.js` (update to use env var)

```javascript
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

export const api = {
  getMatches: (params) => {
    const query = params ? new URLSearchParams(params).toString() : '';
    return fetch(`${API_BASE_URL}/matches/${query ? '?' + query : ''}`)
      .then(res => res.json())
      .catch(err => {
        console.error('Error fetching matches:', err);
        return [];
      });
  },
  // ... other methods ...
};
```

---

## Backend Deployment (Django API)

### Step 1: Prepare GitHub Repository

```bash
# Initialize git (if not already done)
git init

# Create .gitignore
echo "venv/" >> .gitignore
echo "__pycache__/" >> .gitignore
echo "*.pyc" >> .gitignore
echo ".env" >> .gitignore
echo "*.sqlite3" >> .gitignore
echo "staticfiles/" >> .gitignore

# Add all files
git add .

# Commit
git commit -m "Initial commit: Ubakala League backend"

# Push to GitHub
git remote add origin https://github.com/YOUR_USERNAME/ubakala-league.git
git branch -M main
git push -u origin main
```

### Step 2: Set Up PostgreSQL Database

Choose ONE provider:

#### Option A: Neon (Recommended for Beginners)
1. Go to [neon.tech](https://neon.tech)
2. Sign up → Create project → Create database
3. Copy connection string: `postgresql://user:password@host:5432/dbname`
4. Keep this string safe; you'll need it in Render

#### Option B: Supabase
1. Go to [supabase.com](https://supabase.com)
2. Create project → Enable PostgreSQL
3. Copy connection string from settings
4. Keep this string safe

### Step 3: Deploy Backend to Render

1. **Go to [render.com](https://render.com)** → Log in with GitHub
2. **Click "New +"** → Select **"Web Service"**
3. **Connect GitHub Repository**
   - Select your repository
   - Branch: `main`
4. **Configure Service**
   - Name: `ubakala-backend`
   - Runtime: `Python 3.11`
   - Build Command: `bash build.sh`
   - Start Command: `gunicorn backend.wsgi:application`
5. **Set Environment Variables**
   - Click "Advanced" → "Add Environment Variable"
   - Add these variables:
     ```
     DEBUG=False
     SECRET_KEY=your-random-secret-key-here
     DB_NAME=neon_database_name
     DB_USER=neon_user
     DB_PASSWORD=neon_password
     DB_HOST=pg-xxxxx.neon.tech
     DB_PORT=5432
     FRONTEND_URL=https://ubakala-frontend.render.com
     RENDER_EXTERNAL_HOSTNAME=ubakala-backend.render.com
     ```
6. **Plan**: Select "Free" tier
7. **Create Web Service** → Wait for deployment (5-10 minutes)

### Step 4: Verify Backend Deployment

Once deployed:
```bash
# Test the API endpoint
curl https://ubakala-backend.render.com/api/
```

Should return JSON response without errors.

---

## Frontend Deployment (React)

### Step 1: Prepare Frontend Build

```bash
cd frontend

# Build the React app
npm run build

# This creates a 'build' folder with optimized static files
```

### Step 2: Deploy Frontend to Render

1. **Go to [render.com](https://render.com)**
2. **Click "New +"** → Select **"Static Site"**
3. **Connect GitHub Repository**
   - Select your repository (same one)
   - Branch: `main`
4. **Configure Service**
   - Name: `ubakala-frontend`
   - Build Command: `cd frontend && npm install && npm run build`
   - Publish Directory: `frontend/build`
5. **Set Environment Variables** (Optional, if needed)
   - Add `REACT_APP_API_URL=https://ubakala-backend.render.com/api`
6. **Plan**: Select "Free" tier
7. **Create Static Site** → Wait for deployment (3-5 minutes)

### Step 3: Verify Frontend Deployment

Once deployed:
- Visit `https://ubakala-frontend.onrender.com` (or your custom domain)
- Should load the React app
- Open DevTools (F12) → Network → verify API calls go to your backend

---

## Database Setup

### PostgreSQL Initialization on Render

When your backend first deploys, it runs the `release` command from `Procfile`:

```bash
release: python manage.py migrate
```

This automatically:
1. Connects to PostgreSQL
2. Runs Django migrations
3. Creates tables based on your models

**No manual database setup needed!** 🎉

---

## Domain & DNS Configuration

### Option A: Use Free Render Subdomains

- Backend: `ubakala-backend.onrender.com` (automatic)
- Frontend: `ubakala-frontend.onrender.com` (automatic)

**Pros:** Free, no setup
**Cons:** Subdomains are less professional

### Option B: Use Custom Domain

#### If you have a domain (e.g., ubakala.com):

1. **On Render Dashboard:**
   - Select your Web Service (backend)
   - Go to "Settings"
   - Add Custom Domain: `api.ubakala.com`
   - Copy the CNAME value Render provides

2. **On Your Domain Registrar** (GoDaddy, Namecheap, etc.):
   - Go to DNS settings
   - Create CNAME record:
     ```
     Name: api
     Value: ubakala-backend.onrender.com
     ```
   - Create CNAME record for frontend:
     ```
     Name: www
     Value: ubakala-frontend.onrender.com
     ```

3. **Wait 15-30 minutes** for DNS to propagate

4. **Verify:**
   ```bash
   nslookup api.ubakala.com
   nslookup www.ubakala.com
   ```

### Option C: Get Free Domain from Render

Render allows free `.onrender.com` subdomains (already applied).

---

## Environment Variables

### Backend Environment Variables

| Variable | Value | Source |
|----------|-------|--------|
| `DEBUG` | `False` | Fixed for production |
| `SECRET_KEY` | Random string | Generate: `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"` |
| `DB_NAME` | Database name | From Neon/Supabase |
| `DB_USER` | Database user | From Neon/Supabase |
| `DB_PASSWORD` | Database password | From Neon/Supabase |
| `DB_HOST` | Database host | From Neon/Supabase |
| `DB_PORT` | `5432` | From Neon/Supabase |
| `FRONTEND_URL` | `https://ubakala-frontend.onrender.com` | Your frontend URL |
| `RENDER_EXTERNAL_HOSTNAME` | `ubakala-backend.onrender.com` | Render generates this |

### How to Generate SECRET_KEY

Run locally:
```bash
python
>>> from django.core.management.utils import get_random_secret_key
>>> print(get_random_secret_key())
```

Copy the output and paste into `SECRET_KEY` env var.

---

## Troubleshooting

### Issue: Backend won't start (500 error)

**Check logs:**
1. Go to Render dashboard → Select backend service
2. Click "Logs"
3. Look for error messages

**Common causes:**
- Database connection failed → Verify `DB_*` env vars
- Migration failed → Check database user permissions
- Static files error → Ensure `build.sh` is correct

### Issue: Frontend can't reach backend API

**Check:**
1. Backend service is running (no 500 errors)
2. `FRONTEND_URL` in backend settings matches your frontend URL
3. Frontend's `REACT_APP_API_URL` points to correct backend URL
4. CORS is enabled on backend (check `settings.py`)

**Debug in browser console (F12):**
```javascript
fetch('https://ubakala-backend.onrender.com/api/')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error)
```

### Issue: Free tier keeps spinning down

**Render free tier behavior:**
- Services spin down after 15 minutes of inactivity
- First request takes 30+ seconds to wake up
- Upgrade to paid tier for always-on services (~$7/month)

**Workaround:** Keep it alive with periodic ping
```bash
# Test endpoint occasionally
curl https://ubakala-backend.onrender.com/api/
```

### Issue: Database migrations fail

**Check:**
1. Database credentials are correct in env vars
2. Database is created and accessible
3. Run migrations manually:
   ```bash
   python manage.py migrate --run-syncdb
   ```

---

## Post-Deployment Checklist

- [ ] Backend deployed and returning data from API
- [ ] Frontend deployed and loads without errors
- [ ] Database migrations ran successfully
- [ ] Frontend can communicate with backend (check Network tab in DevTools)
- [ ] Custom domain configured (if applicable)
- [ ] Admin panel accessible at `/admin/`
- [ ] CORS errors resolved (no 403 errors in browser console)
- [ ] SSL certificate installed (should be automatic on Render)
- [ ] Test user login/authentication flow
- [ ] Test match creation and updates
- [ ] Bracket and results pages display correctly
- [ ] Set up monitoring/alerts on Render dashboard
- [ ] Create backup of database regularly

---

## Additional Resources

- **Render Docs:** https://render.com/docs
- **Django Deployment:** https://docs.djangoproject.com/en/6.0/howto/deployment/
- **PostgreSQL Providers:**
  - Neon: https://neon.tech
  - Supabase: https://supabase.com
  - ElephantSQL: https://www.elephantsql.com/
- **React Build:** https://create-react-app.dev/docs/production-build/
- **CORS Setup:** https://github.com/adamchainz/django-cors-headers

---

## Summary

**Total deployment time: ~30 minutes**

1. **Prep (5 min):** Create config files & update settings
2. **GitHub (5 min):** Commit & push to main branch
3. **PostgreSQL (5 min):** Get database credentials from Neon/Supabase
4. **Backend Deploy (5 min):** Create Render Web Service
5. **Frontend Deploy (5 min):** Create Render Static Site
6. **Verification (5 min):** Test both services

**After deployment, you're live!** 🎉

