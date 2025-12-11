from django.core.management.base import BaseCommand
from league.models import Match, Team, Season

class Command(BaseCommand):
    help = "Print matches between EZU N'ERIM and AVODIM in Junior Boys 2025, showing award status and scores."

    def handle(self, *args, **options):
        team1_name = "EZU N'ERIM"
        team2_name = "AVODIM"
        season_name = "2025 JUNIOR BOYS CUP"

        team1 = Team.objects.get(name=team1_name)
        team2 = Team.objects.get(name=team2_name)
        season = Season.objects.get(name=season_name)

        matches = Match.objects.filter(season=season, home_team__in=[team1, team2], away_team__in=[team1, team2])

        self.stdout.write(f"Matches between {team1_name} and {team2_name} in {season_name}:")
        for m in matches:
            # safe date retrieval (models may use different field names)
            date_val = getattr(m, 'date', None) or getattr(m, 'match_date', None) or getattr(m, 'played_at', None)
            date_str = date_val.isoformat() if hasattr(date_val, 'isoformat') else (str(date_val) if date_val is not None else 'N/A')
            award_reason = getattr(m, 'award_reason', None) or getattr(m, 'awarded_reason', None)
            self.stdout.write(
                f"ID: {m.id}, Date: {date_str}, Home: {m.home_team.name}, Away: {m.away_team.name}, Score: {m.home_score}-{m.away_score}, Awarded: {m.awarded}, Awarded To: {getattr(m.awarded_to, 'name', None)}, Reason: {award_reason}"
            )
