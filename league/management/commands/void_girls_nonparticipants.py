from django.core.management.base import BaseCommand
from django.utils import timezone

from league.models import Match, Season, Team


class Command(BaseCommand):
    help = 'Mark matches between specified teams in girls seasons as void due to non-participation'

    def add_arguments(self, parser):
        parser.add_argument('team_a', type=str, help='Home or first team name')
        parser.add_argument('team_b', type=str, help='Away or second team name')
        parser.add_argument('--dry-run', action='store_true', help='Show changes without applying')

    def handle(self, *args, **options):
        a = options['team_a']
        b = options['team_b']
        dry = options['dry_run']

        girls_seasons = Season.objects.filter(category__iexact='girls')
        if not girls_seasons.exists():
            self.stdout.write(self.style.WARNING('No seasons with category "girls" found'))
            return

        seasons_list = list(girls_seasons.values_list('id', flat=True))

        # Fetch all matches in girls seasons and filter in Python by team names
        all_matches = Match.objects.filter(season_id__in=seasons_list).select_related('home_team', 'away_team')
        target = []
        for m in all_matches:
            n1 = (m.home_team.name or '').strip().lower()
            n2 = (m.away_team.name or '').strip().lower()
            if (n1 == a.strip().lower() and n2 == b.strip().lower()) or (n1 == b.strip().lower() and n2 == a.strip().lower()):
                target.append(m)

        if not target:
            self.stdout.write(self.style.NOTICE(f'No matches found between "{a}" and "{b}" in girls seasons'))
            return

        for m in target:
            self.stdout.write(f'Found match id={m.id} season={m.season.name} date={m.match_date} teams={m.home_team.name} vs {m.away_team.name}')
        
        if dry:
            self.stdout.write(self.style.SUCCESS(f'Dry run complete: {len(target)} match(es) would be marked void.'))
            return

        for m in target:
            m.home_score = None
            m.away_score = None
            m.penalty_home = None
            m.penalty_away = None
            m.is_played = False
            m.awarded = False
            m.awarded_reason = ''
            m.void = True
            m.awarded_to = None
            m.awarded_at = None
            m.awarded_by = 'system: marked void - non participation'
            if m.venue:
                m.venue = f'VOID: {m.venue}'
            else:
                m.venue = 'VOID: both teams did not participate'
            m.save()
            self.stdout.write(self.style.SUCCESS(f'Marked match id={m.id} void'))
