import os
import sys
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

import django
django.setup()

from league.models import Match, Team

# Find EZU N'ERIM and AVODIM team IDs
home = Team.objects.filter(name__icontains="EZU N'ERIM").first()
away = Team.objects.filter(name__icontains="AVODIM").first()
if not home or not away:
    print('Could not find teams EZU N\'ERIM or AVODIM')
else:
    matches = Match.objects.filter(home_team=home, away_team=away) | Match.objects.filter(home_team=away, away_team=home)
    for m in matches:
        print(f"Match ID: {m.id}")
        print(f"{m.home_team.name} vs {m.away_team.name} @ {m.match_date}")
        print(f"Scores: {m.home_score} - {m.away_score}")
        print(f"Awarded: {m.awarded} Reason: {m.awarded_reason} To: {m.awarded_to}")
        print(f"Original scores: {m.original_home_score} - {m.original_away_score}")
        print(f"Awarded at: {m.awarded_at} By: {m.awarded_by}")
        print('---')
