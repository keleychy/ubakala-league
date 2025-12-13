from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone


class Command(BaseCommand):
    help = 'Add a Final match for a girls season so results can be entered later'

    def add_arguments(self, parser):
        parser.add_argument('season_name', type=str)
        parser.add_argument('--dry-run', action='store_true', help='Do not write to DB')

    def handle(self, *args, **options):
        from league.models import Season, Team, Match

        season_name = options['season_name']
        dry_run = options.get('dry_run')

        season = Season.objects.filter(name__iexact=season_name, category='girls').first()
        if not season:
            raise CommandError(f"Girls season '{season_name}' not found")

        # create two placeholder finalists
        left_name = 'Finalist 1 (placeholder)'
        right_name = 'Finalist 2 (placeholder)'
        left, _ = Team.objects.get_or_create(name=left_name, defaults={'short_name': left_name[:20], 'archived': True})
        right, _ = Team.objects.get_or_create(name=right_name, defaults={'short_name': right_name[:20], 'archived': True})

        # matchday 29 reserved for final
        exists = Match.objects.filter(season=season, matchday=29).exists()
        if exists:
            self.stdout.write(self.style.WARNING(f"A final (matchday 29) already exists for season {season.name}"))
            return

        if dry_run:
            self.stdout.write(f"Would create final for season {season.name} with placeholders")
            return

        m = Match.objects.create(season=season, home_team=left, away_team=right, match_date=timezone.now())
        m.matchday = 29
        m.save()
        self.stdout.write(self.style.SUCCESS(f"Created final match {m.id} for season {season.name}"))
