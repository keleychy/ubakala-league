#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from league.models import Match, Season
from datetime import datetime, timedelta

# Get all seasons
seasons = Season.objects.all()
print("Seasons:", [s.name for s in seasons])

# Get today's date
today = datetime.now().date()
print(f"\nToday: {today}")

# Get matches for today
matches_today = Match.objects.filter(match_date__date=today).order_by('match_date')
print(f"\nMatches for today: {matches_today.count()}")
for m in matches_today:
    print(f"  {m.home_team.name} vs {m.away_team.name} - {m.match_date} (is_played: {m.is_played})")

# Get all matches
all_matches = Match.objects.all().order_by('-match_date')[:10]
print(f"\nLast 10 matches:")
for m in all_matches:
    print(f"  {m.home_team.name} vs {m.away_team.name} - {m.match_date} (is_played: {m.is_played})")

# Check for matches with is_played=True
played_matches = Match.objects.filter(is_played=True).order_by('-match_date')[:5]
print(f"\nLast 5 played matches:")
for m in played_matches:
    print(f"  {m.home_team.name} vs {m.away_team.name} - {m.match_date} (is_played: {m.is_played})")
