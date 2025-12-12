#!/usr/bin/env bash


set -o errexit



# Install Python dependencies


pip install -r requirements.txt



# Run migrations and collect static files


python manage.py collectstatic --no-input


python manage.py migrate



# --- START DATA LOADING ---


# Check for the flag file. If it exists, load initial data and remove the file.


# This ensures loaddata only runs ONCE on the first deploy of this script.


if [ -f "local_data.json" ]


then


echo "Initial data fixture found. Loading data..."


python manage.py loaddata local_data.json


echo "Initial data loaded successfully."


fi


# --- END DATA LOADING ---