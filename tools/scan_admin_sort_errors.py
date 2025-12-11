import os
import sys
import traceback

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

import django
django.setup()

from django.test import RequestFactory
from django.contrib.auth import get_user_model
from django.contrib import admin
from league.models import Match
from league.admin import MatchAdmin

User = get_user_model()
user = User.objects.filter(is_staff=True).first()
if not user:
    print('No staff user found; creating temp staff user')
    user = User.objects.create_user('admin_temp2', password='pass')
    user.is_staff = True
    user.is_superuser = True
    user.save()

rf = RequestFactory()
ma = MatchAdmin(Match, admin.site)

categories = ['', 'senior_boys', 'girls', 'junior_boys']
# typical admin 'o' values are integers as strings; try a range
orders = [str(i) for i in range(-6, 7)]

errors = []
for cat in categories:
    for o in orders:
        params = {}
        if cat:
            params['season_category'] = cat
        params['o'] = o
        request = rf.get('/admin/league/match/', params)
        request.user = user
        try:
            resp = ma.changelist_view(request)
        except Exception:
            tb = traceback.format_exc()
            errors.append({'category': cat, 'o': o, 'traceback': tb})
            print(f'Exception for category={cat!r} o={o!r}:')
            print(tb)

if not errors:
    print('No exceptions encountered for tried combinations.')
else:
    print(f'Found {len(errors)} exceptions.')

print('Scan complete')
