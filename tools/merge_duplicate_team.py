#!/usr/bin/env python
import sys
from django.db import transaction

# Run with: python tools/merge_duplicate_team.py

import os
import django
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
try:
    django.setup()
except Exception as e:
    print('Django setup failed:', e)
    sys.exit(1)

from league.models import Team, Match, TeamGroup

OLD_NAME = 'AMIBO'
NEW_NAME = 'AMIGBO'

old = Team.objects.filter(name__iexact=OLD_NAME).first()
new = Team.objects.filter(name__iexact=NEW_NAME).first()

print('Old team:', old.id if old else None, getattr(old, 'name', None))
print('New team:', new.id if new else None, getattr(new, 'name', None))

if not old or not new:
    print('Either old or new team not found. Aborting.')
    sys.exit(1)

before_home = list(Match.objects.filter(home_team=old).values_list('id', flat=True))
before_away = list(Match.objects.filter(away_team=old).values_list('id', flat=True))
print('Matches referencing OLD as home:', before_home)
print('Matches referencing OLD as away:', before_away)

if not before_home and not before_away:
    print('No matches to reassign. Deleting old team row.')
    with transaction.atomic():
        old.delete()
    print('Deleted old team.')
    sys.exit(0)

with transaction.atomic():
    for mid in before_home:
        m = Match.objects.get(id=mid)
        m.home_team = new
        m.save()
    for mid in before_away:
        m = Match.objects.get(id=mid)
        m.away_team = new
        m.save()
    # move any TeamGroup rows (if present)
    TeamGroup.objects.filter(team=old).update(team=new)
    # finally delete the old team
    old.delete()

print('Reassignment complete.')

after_home = list(Match.objects.filter(home_team=new).values_list('id', flat=True))
after_away = list(Match.objects.filter(away_team=new).values_list('id', flat=True))
print('Matches referencing NEW as home (sample):', after_home)
print('Matches referencing NEW as away (sample):', after_away)
print('Done.')
