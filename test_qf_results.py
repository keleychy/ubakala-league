#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from league.models import Season, Match

s = Season.objects.filter(name__icontains='GIRLS').first()

# Mark QF1 (MD22) as played with MGBARAKUMA (home) winning
qf1 = Match.objects.filter(season=s, matchday=22).first()
if qf1:
    qf1.home_score = 2
    qf1.away_score = 1
    qf1.is_played = True
    qf1.save()
    print(f"QF1 played: {qf1.home_team.name} {qf1.home_score} - {qf1.away_score} {qf1.away_team.name}")

# Mark QF2 (MD23) as played with EZIAMA (home) winning
qf2 = Match.objects.filter(season=s, matchday=23).first()
if qf2:
    qf2.home_score = 2
    qf2.away_score = 0
    qf2.is_played = True
    qf2.save()
    print(f"QF2 played: {qf2.home_team.name} {qf2.home_score} - {qf2.away_score} {qf2.away_team.name}")
