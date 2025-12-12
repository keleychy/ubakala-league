#!/usr/bin/env bash
set -o errexit
# Install Python dependencies
pip install -r requirements.txt
# Run migrations and collect static files
python manage.py collectstatic --no-input
python manage.py migrate