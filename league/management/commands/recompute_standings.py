from django.core.management.base import BaseCommand
from league.models import Season
from league.utils import compute_standings

class Command(BaseCommand):
    help = 'Recompute and print standings for all seasons.'

    def handle(self, *args, **options):
        seasons = Season.objects.all()
        for season in seasons:
            self.stdout.write(f'Standings for season: {season.name} ({season.category})')
            standings = compute_standings(season.id)
            # If standings is a dict (grouped), print by group
            if isinstance(standings, dict):
                for group, teams in standings.items():
                    self.stdout.write(f'  Group {group}:')
                    for team in teams:
                        self.stdout.write(f"    {team['team_name']}: {team['points']} pts, {team['goals_for']} GF, {team['goals_against']} GA")
            # If standings is a list, print all teams
            elif isinstance(standings, list):
                for team in standings:
                    self.stdout.write(f"  {team['team_name']}: {team['points']} pts, {team['goals_for']} GF, {team['goals_against']} GA")
            else:
                self.stdout.write(f'  Unexpected standings format: {type(standings)}')
            self.stdout.write('---')
