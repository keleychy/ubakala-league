#!/usr/bin/env bash
set -euo pipefail

# Usage:
# RENDER_API_KEY=... RENDER_SERVICE_ID=... ./scripts/render_deploy.sh --start-command "gunicorn backend.wsgi:application --bind 0.0.0.0:$PORT --workers 2 --timeout 120" --env-file .render_env

API_BASE="https://api.render.com/v1"

usage() {
  cat <<EOF
Usage: $0 --start-command "..." --env-file <file>

Environment variables required:
  RENDER_API_KEY   (Render API key with service:env-var:write and service:deploy permissions)
  RENDER_SERVICE_ID  (Render Service ID, e.g. srv-xxxxxxxx)

The env-file should contain KEY=VALUE pairs, one per line. Secret values will be created as secure env vars.
EOF
}

if [ "$#" -eq 0 ]; then
  usage
  exit 1
fi

START_COMMAND=""
ENV_FILE=""

while [ "$#" -gt 0 ]; do
  case "$1" in
    --start-command)
      START_COMMAND="$2"; shift 2;;
    --env-file)
      ENV_FILE="$2"; shift 2;;
    -h|--help)
      usage; exit 0;;
    *) echo "Unknown arg: $1"; usage; exit 2;;
  esac
done

: "${RENDER_API_KEY:?RENDER_API_KEY is required in environment}"
: "${RENDER_SERVICE_ID:?RENDER_SERVICE_ID is required in environment}"

auth_header=("Authorization: Bearer ${RENDER_API_KEY}")
content_header=("Content-Type: application/json")

echo "Setting Start Command for service ${RENDER_SERVICE_ID}..."
if [ -n "$START_COMMAND" ]; then
  data=$(jq -nc --arg sc "$START_COMMAND" '{startCommand: $sc}')
  resp=$(curl -sS -X PATCH "${API_BASE}/services/${RENDER_SERVICE_ID}" -H "Authorization: Bearer ${RENDER_API_KEY}" -H "Content-Type: application/json" -d "$data")
  echo "Service update response: ${resp}" | sed -n '1,5p'
fi

if [ -n "$ENV_FILE" ] && [ -f "$ENV_FILE" ]; then
  echo "Uploading env vars from $ENV_FILE..."
  # get existing env vars
  existing=$(curl -sS -H "Authorization: Bearer ${RENDER_API_KEY}" "${API_BASE}/services/${RENDER_SERVICE_ID}/env-vars")

  while IFS= read -r line || [ -n "$line" ]; do
    line=$(echo "$line" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')
    [ -z "$line" ] && continue
    case "$line" in
      \#*) continue ;;
    esac
    key=${line%%=*}
    val=${line#*=}
    # detect if key exists
    env_id=$(echo "$existing" | jq -r --arg k "$key" '.[] | select(.key==$k) | .id' || true)
    if [ -n "$env_id" ] && [ "$env_id" != "null" ]; then
      echo "Updating env var $key (id=$env_id)"
      payload=$(jq -nc --arg v "$val" '{value: $v, secure: true}')
      curl -sS -X PATCH "${API_BASE}/services/${RENDER_SERVICE_ID}/env-vars/${env_id}" -H "Authorization: Bearer ${RENDER_API_KEY}" -H "Content-Type: application/json" -d "$payload" >/dev/null
    else
      echo "Creating env var $key"
      payload=$(jq -nc --arg k "$key" --arg v "$val" '{key: $k, value: $v, secure: true}')
      curl -sS -X POST "${API_BASE}/services/${RENDER_SERVICE_ID}/env-vars" -H "Authorization: Bearer ${RENDER_API_KEY}" -H "Content-Type: application/json" -d "$payload" >/dev/null
    fi
  done < "$ENV_FILE"
fi

echo "Triggering a new deploy for ${RENDER_SERVICE_ID}..."
deploy_resp=$(curl -sS -X POST "${API_BASE}/services/${RENDER_SERVICE_ID}/deploys" -H "Authorization: Bearer ${RENDER_API_KEY}" -H "Content-Type: application/json" -d '{}')
echo "Deploy response: $deploy_resp" | sed -n '1,6p'

echo "Done. Monitor deploy in the Render dashboard." 
