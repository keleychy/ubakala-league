#!/usr/bin/env python
import os
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from rest_framework.request import Request
from rest_framework.test import APIRequestFactory
from league.views import MatchViewSet, SeasonViewSet
from league.models import Match, Season

# Create a request factory
factory = APIRequestFactory()

# Simulate API GET request to /matches/
print("=== Testing /matches/ endpoint ===")
matches_view = MatchViewSet.as_view({'get': 'list'})
request = factory.get('/api/matches/')
response = matches_view(request)
print(f"Status: {response.status_code}")
print(f"Count: {len(response.data) if hasattr(response, 'data') else 'N/A'}")

if hasattr(response, 'data') and response.data:
    print(f"First 3 matches:")
    for match in response.data[:3]:
        print(f"  {match}")

# Simulate API GET request to /seasons/
print("\n=== Testing /seasons/ endpoint ===")
seasons_view = SeasonViewSet.as_view({'get': 'list'})
request = factory.get('/api/seasons/')
response = seasons_view(request)
print(f"Status: {response.status_code}")
print(f"Count: {len(response.data) if hasattr(response, 'data') else 'N/A'}")

if hasattr(response, 'data') and response.data:
    print(f"Seasons:")
    for season in response.data:
        print(f"  {season}")
