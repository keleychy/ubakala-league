import os
import sys
import traceback

# Ensure project root is on sys.path so Django settings module can be imported
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
import django
from django.conf import settings

django.setup()

from django.test import RequestFactory
from django.contrib.auth import get_user_model
from django.contrib import admin
from league.models import Match
from league.admin import MatchAdmin

User = get_user_model()

try:
    # Ensure a staff user exists
    user = User.objects.filter(is_staff=True).first()
    if not user:
        print('No staff user exists. Creating temporary staff user `admin_temp` with password `pass`')
        user = User.objects.create_user('admin_temp', password='pass')
        user.is_staff = True
        user.is_superuser = True
        user.save()

    rf = RequestFactory()
    # Simulate GET request to changelist with an ordering param (sort by first column)
    request = rf.get('/admin/league/match/', {'o': '1'})
    request.user = user

    ma = MatchAdmin(Match, admin.site)
    try:
        response = ma.changelist_view(request)
        print('Response type:', type(response))
        # If response is an HttpResponse, print status code
        try:
            print('Response status code:', response.status_code)
        except Exception:
            pass
    except Exception as e:
        print('Exception raised from changelist_view:')
        traceback.print_exc()

except Exception:
    traceback.print_exc()
    sys.exit(1)

print('Script completed')
