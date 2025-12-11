
import os
import django

import os
print("Current working directory:", os.getcwd())
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from league.models import Match, Team, Season

# Set these to match your actual team and season names
team1_name = "EZU N'ERIM"
team2_name = "AVODIM"
season_name = "Junior Boys 2025"

team1 = Team.objects.get(name=team1_name)
team2 = Team.objects.get(name=team2_name)
season = Season.objects.get(name=season_name)

matches = Match.objects.filter(season=season, home_team__in=[team1, team2], away_team__in=[team1, team2])

print(f"Matches between {team1_name} and {team2_name} in {season_name}:")
for m in matches:
    print(f"ID: {m.id}, Date: {m.date}, Home: {m.home_team.name}, Away: {m.away_team.name}, Score: {m.home_score}-{m.away_score}, Awarded: {m.awarded}, Awarded To: {getattr(m.awarded_to, 'name', None)}, Reason: {m.award_reason}")
