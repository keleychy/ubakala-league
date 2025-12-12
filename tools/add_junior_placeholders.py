#!/usr/bin/env python3
import os
import sys
from datetime import timedelta

# Ensure DJANGO_SETTINGS_MODULE is set to the project's settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

import django
django.setup()

from django.utils import timezone
from league.models import Season, Team, Match


def main():
    s = Season.objects.filter(category='junior_boys').first()
    if not s:
        print('ERROR: no junior_boys season found')
        return 1

    def get_or_create_placeholder(name):
        t, created = Team.objects.get_or_create(name=name, defaults={'archived': True})
        print(('Created' if created else 'Found'), 'team:', t.id, t.name)
        return t

    home3 = get_or_create_placeholder('TBD (3rd Place Home)')
    away3 = get_or_create_placeholder('TBD (3rd Place Away)')
    homeF = get_or_create_placeholder('TBD (Final Home)')
    awayF = get_or_create_placeholder('TBD (Final Away)')

    now = timezone.now()

    m3 = Match.objects.filter(season=s, matchday=28).first()
    if m3:
        print('Third-place match already exists with id', m3.id)
    else:
        m3 = Match.objects.create(season=s, home_team=home3, away_team=away3, match_date=now + timedelta(days=1), matchday=28)
        print('Created third-place match id', m3.id)

    mF = Match.objects.filter(season=s, matchday=29).first()
    if mF:
        print('Final match already exists with id', mF.id)
    else:
        mF = Match.objects.create(season=s, home_team=homeF, away_team=awayF, match_date=now + timedelta(days=2), matchday=29)
        print('Created final match id', mF.id)

    return 0


if __name__ == '__main__':
    sys.exit(main())
