Render automation
=================

This repository includes a small automation setup to programmatically update a Render service Start Command, create/update environment variables, and trigger a new deploy.

Files added
- `scripts/render_deploy.sh` — script that calls the Render API to set the Start Command, create/update env vars from a file, and trigger a deploy.
- `.github/workflows/render-deploy.yml` — a GitHub Action which runs the script. It expects two repository secrets: `RENDER_API_KEY` and `RENDER_SERVICE_ID`.

How to use
1. Add the following GitHub repository secrets (Settings → Secrets → Actions):
   - `RENDER_API_KEY` — a Render API key with permissions to update services/env-vars and trigger deploys.
   - `RENDER_SERVICE_ID` — the service id for your Render service (format: `srv-xxxxxxxx`).

2. Prepare an env file (optional). Example `.render_env` in repo root:
```
DJANGO_SETTINGS_MODULE=backend.settings
SECRET_KEY=super-long-secret
DATABASE_URL=postgres://user:pass@host:5432/dbname
ALLOWED_HOSTS=your-service.onrender.com
DEBUG=False
PYTHONUNBUFFERED=1
```

3. Trigger the GitHub Action manually (Actions → Render — configure and deploy → Run workflow). Fill `start_command` and `env_file_path` inputs if needed.

Or run locally (requires `jq` and `curl`):
```
export RENDER_API_KEY=...
export RENDER_SERVICE_ID=srv-...
./scripts/render_deploy.sh --start-command "gunicorn backend.wsgi:application --bind 0.0.0.0:$PORT --workers 2 --timeout 120" --env-file .render_env
```

Notes
- The script uses the Render HTTP API v1 endpoints. It will create env vars as secure values.
- You must provide a valid `RENDER_API_KEY` and the correct `RENDER_SERVICE_ID` for your service.
- I cannot run the Render API calls from this environment — you (or the GitHub Action) must provide the secrets so the script can run.
