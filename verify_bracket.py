#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from league.models import Season, Match

s = Season.objects.filter(name__icontains='GIRLS').first()
matches = Match.objects.filter(season=s, matchday__gte=22).order_by('matchday')

print("Girls Knockout Bracket:")
print("-" * 60)
for m in matches:
    print(f'MD{m.matchday}: {m.home_team.name:20} vs {m.away_team.name:20} - {m.match_date.strftime("%m/%d %H:%M")}')
