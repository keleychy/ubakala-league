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
python manage.py migrate --noinput

# --- 3. Data Loading (Robust Check) ---

# Optional: Script to enforce correct file encoding locally before deployment
# (This step is only necessary if you put the file fixer script in 'scripts/')
# if [ -f "scripts/fix_initial_data_encoding.py" ]; then
#     echo "Fixing fixture encoding if necessary..."
#     python scripts/fix_initial_data_encoding.py
# fi

# Load Initial Data - prioritize initial_data.json
if [ -f "initial_data.json" ]; then
    echo "Initial data fixture found (initial_data.json). Loading data..."
    # The '|| true' allows the build to continue if loaddata fails due to
    # expected errors (e.g., data already exists) but is less safe. 
    # Since you fixed the encoding, let's remove || true to catch real errors.
    python manage.py loaddata initial_data.json
    echo "Initial data load successful."
elif [ -f "local_data.json" ]; then
    echo "Initial data fixture found (local_data.json). Loading data..."
    python manage.py loaddata local_data.json
    echo "Local data load successful."
else
    echo "No initial fixture found (initial_data.json or local_data.json). Skipping loaddata."
fi

# End of build.sh