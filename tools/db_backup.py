#!/usr/bin/env python
import os
import sys
from datetime import datetime

# Usage: python tools/db_backup.py

sys.path.append(os.path.dirname(os.path.dirname(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

import django
try:
    django.setup()
except Exception as e:
    print('Django setup failed:', e)
    sys.exit(1)

from django.core.management import call_command

BACKUP_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'backups')
os.makedirs(BACKUP_DIR, exist_ok=True)

ts = datetime.utcnow().strftime('%Y%m%dT%H%M%SZ')
backup_file = os.path.join(BACKUP_DIR, f'dumpdata_{ts}.json')

print('Creating backup to', backup_file)
with open(backup_file, 'w', encoding='utf-8') as f:
    # Exclude auth.permission and contenttypes to reduce noise
    call_command('dumpdata', '--natural-primary', '--indent', '2', stdout=f)

print('Backup complete.')
