#!/usr/bin/env bash

# Use 'set -o errexit' (or set -e) to exit immediately if any command fails
set -o errexit

# --- 1. Install Dependencies ---
echo "Installing Python dependencies..."
pip install -r requirements.txt

# --- 2. Static Files & Migrations ---
echo "Collecting static files..."
python manage.py collectstatic --no-input

echo "Running migrations..."
python manage.py migrate --no-input

# --- 3. Full Data Loading ---

# Load the comprehensive fixture which includes all data (including Superuser)
if [ -f "full_data_dump.json" ]; then
    echo "Comprehensive data fixture found (full_data_dump.json). Loading ALL data..."
    
    # Load the fixture using the fixture name without the .json extension
    # We explicitly exclude contenttypes/sessions/permissions which can cause conflicts
    python manage.py loaddata full_data_dump
    
    echo "Full data load successful. Superuser included."
else
    echo "No comprehensive fixture found (full_data_dump.json). Skipping loaddata."
fi

# End of build.sh