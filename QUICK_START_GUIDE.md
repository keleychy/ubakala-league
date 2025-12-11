# 🎯 Ubakala League - Quick Start Implementation Guide

**Start Here!** This guide walks you through deployment in ~30 minutes with copy-paste commands.

---

## ⏱️ Time Estimate
- **Setup & Config:** 10 minutes
- **Database Setup:** 5 minutes  
- **Backend Deploy:** 5 minutes
- **Frontend Deploy:** 5 minutes
- **Testing:** 5 minutes
- **Total:** ~30 minutes

---

## Phase 1️⃣: Local Preparation (5 Minutes)

### Step 1.1: Update Backend Settings

Open `backend/settings.py` and make these changes:

**At the very top of the file**, add:
```python
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()
```

**Find and replace these sections:**

1. **DEBUG line** (around line 25):
```python
# OLD:
DEBUG = True

# NEW:
DEBUG = os.getenv('DEBUG', 'False') == 'True'
```

2. **ALLOWED_HOSTS** (around line 28):
```python
# OLD:
ALLOWED_HOSTS = []

# NEW:
ALLOWED_HOSTS = [
    'localhost',
    '127.0.0.1',
    os.getenv('RENDER_EXTERNAL_HOSTNAME', ''),
]
ALLOWED_HOSTS = [h for h in ALLOWED_HOSTS if h]
```

3. **SECRET_KEY** (around line 23):
```python
# OLD:
SECRET_KEY = 'django-insecure-aw2$6c$gw!##1du0md+_@wfaf^(25e_a+2+d$8ts8)z&p0^9$n'

# NEW:
SECRET_KEY = os.getenv('SECRET_KEY', 'django-insecure-aw2$6c$gw!##1du0md+_@wfaf^(25e_a+2+d$8ts8)z&p0^9$n')
```

4. **DATABASES** (around line 80):
```python
# OLD:
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": "ubakala_db",
        "USER": "ubakala_user",
        "PASSWORD": "uba2025",
        "HOST": "localhost",
        "PORT": "5432",
    }
}

# NEW:
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.getenv('DB_NAME', 'ubakala_db'),
        "USER": os.getenv('DB_USER', 'ubakala_user'),
        "PASSWORD": os.getenv('DB_PASSWORD', 'password'),
        "HOST": os.getenv('DB_HOST', 'localhost'),
        "PORT": os.getenv('DB_PORT', '5432'),
    }
}
```

5. **CORS** (around line 75):
```python
# OLD:
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
CORS_ALLOW_ALL_ORIGINS = True

# NEW:
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://ubakala-frontend.onrender.com",
    os.getenv('FRONTEND_URL', ''),
]
CORS_ALLOWED_ORIGINS = [o for o in CORS_ALLOWED_ORIGINS if o]
CORS_ALLOW_ALL_ORIGINS = DEBUG
```

6. **Add at the END of settings.py**:
```python
# Production Security
SECURE_SSL_REDIRECT = not DEBUG
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG

# Static Files
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# Middleware - Add WhiteNoise (add at position 1 in MIDDLEWARE list):
# MIDDLEWARE = [
#     'django.middleware.security.SecurityMiddleware',
#     'whitenoise.middleware.WhiteNoiseMiddleware',  # ADD THIS
#     'corsheaders.middleware.CorsMiddleware',
#     ...
```

### Step 1.2: Create .env File

Copy the `.env.example` file and create a `.env`:

```bash
# Windows PowerShell
Copy-Item .env.example .env

# macOS/Linux
cp .env.example .env
```

Your `.env` file is already created. Keep it **empty for now**—you'll fill it in Step 2 when you get database credentials.

### Step 1.3: Verify Files Exist

Check that these files are in your project root:
- ✅ `Procfile` (should exist)
- ✅ `build.sh` (should exist)
- ✅ `requirements.txt` (should exist)
- ✅ `.env.example` (should exist)
- ✅ `.gitignore` (should exist)

### Step 1.4: Frontend Configuration

Create `frontend/.env.production`:

```
REACT_APP_API_URL=https://ubakala-backend.onrender.com/api
```

---

## Phase 2️⃣: Database Setup (5 Minutes)

Choose **ONE** option below:

### Option A: Neon (Easiest - Recommended ⭐)

1. Go to **[neon.tech](https://neon.tech)**
2. Click "Sign up" → Use GitHub to sign up (easier)
3. Create a new project → Select PostgreSQL
4. Copy your connection string from the dashboard
5. It looks like: `postgresql://user:password@host.neon.tech:5432/dbname`
6. Extract the parts:
   - **Host:** `host.neon.tech` (e.g., `ep-cool-wave-123.us-east-1.neon.tech`)
   - **Database:** `dbname` (first part, usually `neondb`)
   - **User:** `user` (usually `neondb_owner`)
   - **Password:** `password` (your password)

### Option B: Supabase (Also Easy)

1. Go to **[supabase.com](https://supabase.com)**
2. Click "Start your project" → Create organization
3. Create a new project (PostgreSQL)
4. Go to Project Settings → Database → Connection string
5. Extract the same info as above

### Option C: ElephantSQL

1. Go to **[elephantsql.com](https://www.elephantsql.com/)**
2. Create account → Create new instance (free tier)
3. Copy connection string
4. Extract info

**After getting your database info, save these values:**
```
DB_NAME = neondb
DB_USER = neondb_owner  
DB_PASSWORD = your_password
DB_HOST = ep-xxxx.us-east-1.neon.tech
DB_PORT = 5432
```

---

## Phase 3️⃣: Git & GitHub (3 Minutes)

### Step 3.1: Initialize Git (if not done)

```bash
# Navigate to project root
cd c:\Users\HP PC\Desktop\ubakala-league

# Initialize git
git init

# Add all files
git add .

# Create first commit
git commit -m "Initial commit: Ubakala League ready for deployment"
```

### Step 3.2: Push to GitHub

1. Go to **[github.com](https://github.com)** → Create a **NEW** repository
   - Name: `ubakala-league`
   - Description: "League management platform"
   - Make it Public (easier for Render to access)
   - **Do NOT** initialize with README/gitignore (you already have them)

2. After creating repo, GitHub shows you commands to run:

```bash
# Add GitHub remote
git remote add origin https://github.com/YOUR_USERNAME/ubakala-league.git

# Change branch name to main
git branch -M main

# Push to GitHub
git push -u origin main
```

✅ Your code is now on GitHub!

---

## Phase 4️⃣: Render Deployment - Backend (5 Minutes)

### Step 4.1: Create Render Account

1. Go to **[render.com](https://render.com)**
2. Click "Get Started" → Sign up with **GitHub** (faster)
3. Authorize Render to access your GitHub account

### Step 4.2: Deploy Backend Service

1. **Click "New +"** in Render dashboard
2. **Select "Web Service"**
3. **Choose your repository:** `ubakala-league` → Select it
4. **Configure the service:**

   | Setting | Value |
   |---------|-------|
   | **Name** | `ubakala-backend` |
   | **Environment** | `Python 3.11` |
   | **Region** | `Ohio` (or closest to you) |
   | **Branch** | `main` |
   | **Build Command** | `bash build.sh` |
   | **Start Command** | `gunicorn backend.wsgi:application` |
   | **Plan** | **Free** ⭐ |

5. **Click "Advanced"** → **Add Environment Variables**

   Copy-paste each pair:
   ```
   DEBUG = False
   SECRET_KEY = (run this locally to generate)
   DB_NAME = (from database)
   DB_USER = (from database)
   DB_PASSWORD = (from database)
   DB_HOST = (from database)
   DB_PORT = 5432
   FRONTEND_URL = https://ubakala-frontend.onrender.com
   RENDER_EXTERNAL_HOSTNAME = ubakala-backend.onrender.com
   ```

   **To generate SECRET_KEY**, run in Python locally:
   ```bash
   python
   >>> from django.core.management.utils import get_random_secret_key
   >>> print(get_random_secret_key())
   # Copy the output
   ```

6. **Click "Create Web Service"** → Wait for deployment (5-10 minutes)

### Step 4.3: Verify Backend is Running

1. Go to Render dashboard → Click your backend service
2. Check "Latest Deployment" logs → Should say "deployed successfully"
3. Copy your service URL (like `https://ubakala-backend.onrender.com`)
4. **Test the API:**
   ```bash
   # Open browser or run:
   curl https://ubakala-backend.onrender.com/api/
   ```
   Should return JSON (not an error)

✅ **Backend is live!**

---

## Phase 5️⃣: Render Deployment - Frontend (5 Minutes)

### Step 5.1: Deploy Frontend Service

1. **In Render dashboard, click "New +"**
2. **Select "Static Site"**
3. **Choose your repository:** `ubakala-league` (same one)
4. **Configure:**

   | Setting | Value |
   |---------|-------|
   | **Name** | `ubakala-frontend` |
   | **Region** | `Ohio` (same as backend) |
   | **Branch** | `main` |
   | **Build Command** | `cd frontend && npm install && npm run build` |
   | **Publish Directory** | `frontend/build` |
   | **Plan** | **Free** ⭐ |

5. **Click "Advanced"** → Add Environment Variable (optional):
   ```
   REACT_APP_API_URL = https://ubakala-backend.onrender.com/api
   ```

6. **Click "Create Static Site"** → Wait for deployment (3-5 minutes)

### Step 5.2: Verify Frontend is Running

1. Go to Render dashboard → Click your frontend service
2. Check logs → Should say "deployed successfully"
3. Copy your service URL (like `https://ubakala-frontend.onrender.com`)
4. **Open in browser:** Click the URL
5. Frontend should load with no blank page
6. Open DevTools (F12) → Console → Should be no red errors

✅ **Frontend is live!**

---

## Phase 6️⃣: Testing (5 Minutes)

### Test 1: Backend API

```bash
# Test endpoint 1: Matches
curl https://ubakala-backend.onrender.com/api/matches/

# Test endpoint 2: Seasons
curl https://ubakala-backend.onrender.com/api/seasons/

# Should return JSON data (not error 500)
```

### Test 2: Frontend + Backend Connection

1. Open browser → Go to `https://ubakala-frontend.onrender.com`
2. Open DevTools (F12) → Network tab
3. Refresh the page
4. Look for API calls going to your backend
5. Should see 200 status (not 404 or 500)

### Test 3: Functionality

1. Navigate to **Results** page → Should load matches
2. Navigate to **Standings** page → Should load standings
3. Navigate to **Bracket** page → Should load bracket
4. No console errors (DevTools → Console)

✅ **Everything working!**

---

## Phase 7️⃣: Optional - Custom Domain (10 Minutes)

### If you have a custom domain:

**Example:** `ubakala.com`

#### Step 7.1: Add Domain to Render (Backend)

1. In Render → Backend Service → Settings
2. Scroll to "Custom Domain"
3. Click "Add Custom Domain"
4. Enter: `api.ubakala.com`
5. Render gives you a CNAME value

#### Step 7.2: Add Domain to Render (Frontend)

1. In Render → Frontend Service → Settings
2. Add Custom Domain
3. Enter: `ubakala.com` (or `www.ubakala.com`)
4. Render gives you a CNAME value

#### Step 7.3: Update DNS at Registrar

1. Log into your domain registrar (GoDaddy, Namecheap, etc.)
2. Find DNS settings
3. Add CNAME records:
   ```
   api.ubakala.com  →  ubakala-backend.onrender.com
   ubakala.com      →  ubakala-frontend.onrender.com
   ```
4. Wait 15-30 minutes for DNS to update

#### Step 7.4: Update Backend Settings

Edit `backend/settings.py`:
```python
ALLOWED_HOSTS = [
    'localhost',
    '127.0.0.1',
    'api.ubakala.com',
    os.getenv('RENDER_EXTERNAL_HOSTNAME', ''),
]

CORS_ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://ubakala.com',
    'https://www.ubakala.com',
    os.getenv('FRONTEND_URL', ''),
]
```

Push to GitHub → Render auto-redeploys ✅

---

## ❌ Troubleshooting

### "Backend shows 500 error in logs"

**Check logs:**
1. Render dashboard → Backend service → Logs
2. Look for error message
3. Common issues:
   - Database connection failed → Verify `DB_*` env vars
   - Migration failed → Check database credentials

**Fix:**
```bash
# Test locally first
python manage.py migrate
python manage.py runserver
```

### "Frontend shows blank page"

1. Open DevTools (F12) → Console
2. Look for red error
3. If API error: Check `REACT_APP_API_URL` in `frontend/.env.production`
4. Verify backend is running (test with curl)

### "CORS error in console"

Error looks like: `Access to XMLHttpRequest from 'https://frontend.com' has been blocked by CORS policy`

**Fix:**
1. Check backend `settings.py` has correct `CORS_ALLOWED_ORIGINS`
2. Include your frontend URL
3. Push changes to GitHub → Render redeploys

### "Free tier too slow / spinning down"

Render free tier:
- Spins down after 15 minutes of no activity
- First request takes 30+ seconds
- This is normal! 

**Solutions:**
- Option 1: Accept the spin-down (it's free!)
- Option 2: Upgrade to paid plan (~$7/month for always-on)

---

## 🎉 You're Done!

Your website is now **LIVE** on Render!

### Your URLs:

```
Backend API:  https://ubakala-backend.onrender.com
Frontend:     https://ubakala-frontend.onrender.com
```

### Or with custom domain:

```
Backend API:  https://api.ubakala.com
Frontend:     https://ubakala.com
```

---

## 📋 Quick Reference

### To Update Your Site (after live)

1. Make changes locally
2. Test locally: `python manage.py runserver` + `npm start`
3. Commit: `git add . && git commit -m "Update message"`
4. Push: `git push origin main`
5. Render automatically redeploys! ✅

### Environment Variables (if you need to change them)

1. Go to Render dashboard → Service → Settings
2. Scroll to "Environment"
3. Edit variables
4. Render redeploys automatically

### Monitoring

- Check Render dashboard weekly
- Review logs if something breaks
- Render sends notifications if service crashes

---

## 📚 Full Documentation

For more details, see:
- `RENDER_DEPLOYMENT_GUIDE.md` - Full architecture guide
- `DEPLOYMENT_CHECKLIST.md` - Detailed checklist
- `SETTINGS_PRODUCTION_GUIDE.md` - Django settings details

---

**Questions?** Check the troubleshooting section above or review the full guides.

**Ready? Start with Phase 1!** 🚀

