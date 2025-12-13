from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone


class Command(BaseCommand):
    help = 'Ensure senior_boys seasons have semifinal, third-place and final matches (matchdays 26-29)'

    def add_arguments(self, parser):
        parser.add_argument('--season_name', type=str, help='Optional season name to limit to a single season')
        parser.add_argument('--dry-run', action='store_true', help='Do not write to DB')

    def handle(self, *args, **options):
        from league.models import Season, Team, Match

        season_name = options.get('season_name')
        dry_run = options.get('dry_run')

        qs = Season.objects.filter(category='senior_boys')
        if season_name:
            qs = qs.filter(name__iexact=season_name)

        if not qs.exists():
            raise CommandError('No senior_boys seasons found matching query')

        created_total = 0
        for season in qs:
            self.stdout.write(f"Processing season: {season.name}")
            # Define the knockout fixtures for semis, 3rd place and final
            fixtures = [
                ('SF1', 'WINNER 22', 'WINNER 23', 26),
                ('SF2', 'WINNER 24', 'WINNER 25', 27),
                ('3rd', 'LOSER 26', 'LOSER 27', 28),
                ('Final', 'WINNER 26', 'WINNER 27', 29),
            ]

            for code, left_tok, right_tok, matchnum in fixtures:
                # create or get placeholder teams for WINNER/LOSER tokens
                def token_team(token):
                    name = f"{token} (placeholder)"
                    short = name[:20]
                    team, _ = Team.objects.get_or_create(name=name, defaults={'short_name': short, 'archived': True})
                    return team

                left = token_team(left_tok)
                right = token_team(right_tok)

                exists = Match.objects.filter(season=season, matchday=matchnum, home_team=left, away_team=right).exists()
                if exists:
                    self.stdout.write(self.style.WARNING(f"Match already exists for {code} in {season.name} (matchday {matchnum})"))
                    continue

                if dry_run:
                    self.stdout.write(f"Would create: {code} for season {season.name} (matchday {matchnum})")
                else:
                    m = Match.objects.create(season=season, home_team=left, away_team=right, match_date=timezone.now())
                    m.matchday = matchnum
                    m.save()
                    created_total += 1
                    self.stdout.write(self.style.SUCCESS(f"Created {code} (match {m.id}) for season {season.name}"))

        self.stdout.write(self.style.SUCCESS(f"Finished. Created {created_total} matches."))
