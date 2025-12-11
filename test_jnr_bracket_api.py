#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from league.models import Match, Season
from league.serializers import MatchSerializer

# Get Junior Boys season
season = Season.objects.filter(name__icontains='junior').first()
print(f"Season: {season.name if season else 'Not found'}")

if season:
    # Get all matches for this season
    all_matches = Match.objects.filter(season=season)
    print(f"\nTotal matches in Junior Boys: {all_matches.count()}")
    
    # Get semifinals and finals (matchday >= 26)
    bracket_matches = all_matches.filter(matchday__gte=26)
    print(f"Semifinals/Finals (matchday >= 26): {bracket_matches.count()}")
    
    # Serialize them
    serializer = MatchSerializer(bracket_matches, many=True)
    print("\nSerialized bracket matches:")
    for match in serializer.data:
        print(f"  ID: {match['id']}, {match['home_team']['name']} vs {match['away_team']['name']}, Matchday: {match['matchday']}")
    
    # Check what MatchViewSet queryset would return
    print("\n\nChecking MatchViewSet queryset:")
    from league.views import MatchViewSet
    viewset = MatchViewSet()
    qs = viewset.get_queryset()
    bracket_from_viewset = qs.filter(season=season, matchday__gte=26)
    print(f"Matches with matchday >= 26 from ViewSet: {bracket_from_viewset.count()}")
    for m in bracket_from_viewset:
        print(f"  ID: {m.id}, {m.home_team.name} vs {m.away_team.name}, Matchday: {m.matchday}")
