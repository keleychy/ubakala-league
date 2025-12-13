#!/usr/bin/env bash


set -o errexit



# Install Python dependencies


pip install -r requirements.txt



# Run migrations and collect static files


python manage.py collectstatic --no-input


python manage.py migrate



# --- START DATA LOADING ---

# Try to ensure any JSON fixtures are UTF-8 encoded before Django loads them.
if [ -f "scripts/fix_initial_data_encoding.py" ]; then
	echo "Fixing fixture encoding if necessary..."
	python scripts/fix_initial_data_encoding.py || true
fi

# Prefer project `initial_data.json` if present, otherwise `local_data.json`.
if [ -f "initial_data.json" ]; then
	echo "Initial data fixture found (initial_data.json). Loading data..."
	python manage.py loaddata initial_data.json || true
	echo "Initial data (initial_data.json) load attempted."
elif [ -f "local_data.json" ]; then
	echo "Initial data fixture found (local_data.json). Loading data..."
	python manage.py loaddata local_data.json || true
	echo "Initial data (local_data.json) load attempted."
else
	echo "No initial fixture found. Skipping loaddata."
fi

# --- END DATA LOADING ---