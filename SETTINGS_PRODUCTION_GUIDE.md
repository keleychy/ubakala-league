# 📝 Production Settings Patch for Django

## File: `backend/settings.py`

Apply the following changes to your `backend/settings.py` to enable production deployment:

### 1. Add at the TOP of the file (after imports):

```python
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()
```

### 2. Replace DEBUG line:

**Before:**
```python
DEBUG = True
```

**After:**
```python
DEBUG = os.getenv('DEBUG', 'False') == 'True'
```

### 3. Replace ALLOWED_HOSTS:

**Before:**
```python
ALLOWED_HOSTS = []
```

**After:**
```python
ALLOWED_HOSTS = [
    'localhost',
    '127.0.0.1',
    os.getenv('RENDER_EXTERNAL_HOSTNAME', ''),
    'ubakala.com',
    'www.ubakala.com',
    'api.ubakala.com',
]
# Remove empty strings
ALLOWED_HOSTS = [host for host in ALLOWED_HOSTS if host]
```

### 4. Replace DATABASES configuration:

**Before:**
```python
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
```

**After:**
```python
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

### 5. Replace CORS configuration:

**Before:**
```python
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
CORS_ALLOW_ALL_ORIGINS = True
```

**After:**
```python
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://ubakala-frontend.onrender.com",
    "https://ubakala.com",
    "https://www.ubakala.com",
    os.getenv('FRONTEND_URL', ''),
]
# Remove empty strings
CORS_ALLOWED_ORIGINS = [origin for origin in CORS_ALLOWED_ORIGINS if origin]
CORS_ALLOW_ALL_ORIGINS = DEBUG  # Only allow all origins in development
```

### 6. Update SECRET_KEY:

**Before:**
```python
SECRET_KEY = 'django-insecure-...'
```

**After:**
```python
SECRET_KEY = os.getenv(
    'SECRET_KEY',
    'django-insecure-aw2$6c$gw!##1du0md+_@wfaf^(25e_a+2+d$8ts8)z&p0^9$n'
)
```

### 7. Add Security Headers (add at the END of settings.py):

```python
# Security Settings
SECURE_SSL_REDIRECT = not DEBUG
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_SECURITY_POLICY = {
    "default-src": ("'self'",),
    "script-src": ("'self'", "'unsafe-inline'"),
}

# HSTS (HTTP Strict Transport Security)
if not DEBUG:
    SECURE_HSTS_SECONDS = 31536000  # 1 year
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True

# Static Files Configuration for Production
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'
STATICFILES_DIRS = [
    os.path.join(BASE_DIR, 'static'),
]
```

### 8. Update Middleware (add WhiteNoise):

**Before:**
```python
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    ...
]
```

**After:**
```python
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',  # ADD THIS LINE
    'corsheaders.middleware.CorsMiddleware',
    ...
]
```

---

## Complete Updated Section

Here's the complete security + production section to add at the end of `settings.py`:

```python
# ============ PRODUCTION CONFIGURATION ============

# Security Settings
SECURE_SSL_REDIRECT = not DEBUG
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG
SECURE_BROWSER_XSS_FILTER = True
X_FRAME_OPTIONS = 'DENY'

# HSTS (HTTP Strict Transport Security)
if not DEBUG:
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True

# Static Files Configuration
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# Media Files
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# Content Security Policy
SECURE_CONTENT_SECURITY_POLICY = {
    "default-src": ("'self'",),
    "script-src": ("'self'", "'unsafe-inline'"),
    "style-src": ("'self'", "'unsafe-inline'"),
    "img-src": ("'self'", "data:", "https:"),
}

print("✓ Production settings loaded")
print(f"  DEBUG: {DEBUG}")
print(f"  ALLOWED_HOSTS: {ALLOWED_HOSTS}")
print(f"  DATABASE: {DATABASES['default']['HOST']}")
```

---

## Summary

After applying these changes:
- ✅ Settings are environment-variable based
- ✅ Production security headers enabled
- ✅ Static files optimized with WhiteNoise
- ✅ CORS configured for production
- ✅ SSL/HTTPS enforced in production
- ✅ Ready for Render deployment

