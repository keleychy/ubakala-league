#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from league.models import Season, Match

s = Season.objects.filter(name__icontains='GIRLS').first()

# Clear QF1 and QF2 results to test the signal
qf1 = Match.objects.filter(season=s, matchday=22).first()
qf2 = Match.objects.filter(season=s, matchday=23).first()
sf1 = Match.objects.filter(season=s, matchday=26).first()

if qf1:
    qf1.home_score = None
    qf1.away_score = None
    qf1.is_played = False
    qf1.save()
    print(f"QF1 cleared")

if qf2:
    qf2.home_score = None
    qf2.away_score = None
    qf2.is_played = False
    qf2.save()
    print(f"QF2 cleared")

if sf1:
    print(f"SF1 before reset: {sf1.home_team.name} vs {sf1.away_team.name}")

# Now mark them as played again to trigger the signal
if qf1:
    qf1.home_score = 2
    qf1.away_score = 1
    qf1.is_played = True
    qf1.save()
    print(f"QF1 marked as played: {qf1.home_team.name} {qf1.home_score}-{qf1.away_score} {qf1.away_team.name}")

if qf2:
    qf2.home_score = 2
    qf2.away_score = 0
    qf2.is_played = True
    qf2.save()
    print(f"QF2 marked as played: {qf2.home_team.name} {qf2.home_score}-{qf2.away_score} {qf2.away_team.name}")

# Check SF1 after the signal should have run
sf1.refresh_from_db()
print(f"\nSF1 after signal: {sf1.home_team.name} vs {sf1.away_team.name}")
