from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta

from league.models import Season, Team, Match


class Command(BaseCommand):
    help = 'Create placeholder teams and matches for Junior Boys 3rd place and Final (matchday 28 and 29)'

    def handle(self, *args, **options):
        s = Season.objects.filter(category='junior_boys').first()
        if not s:
            self.stdout.write(self.style.ERROR('No junior_boys season found'))
            return

        def get_or_create_placeholder(name):
            t, created = Team.objects.get_or_create(name=name, defaults={'archived': True})
            self.stdout.write(f"{'Created' if created else 'Found'} team: {t.id} {t.name}")
            return t

        home3 = get_or_create_placeholder('TBD (3rd Place Home)')
        away3 = get_or_create_placeholder('TBD (3rd Place Away)')
        homeF = get_or_create_placeholder('TBD (Final Home)')
        awayF = get_or_create_placeholder('TBD (Final Away)')

        now = timezone.now()

        m3 = Match.objects.filter(season=s, matchday=28).first()
        if m3:
            self.stdout.write(self.style.WARNING(f'Third-place match already exists with id {m3.id}'))
        else:
            m3 = Match.objects.create(season=s, home_team=home3, away_team=away3, match_date=now + timedelta(days=1), matchday=28)
            self.stdout.write(self.style.SUCCESS(f'Created third-place match id {m3.id}'))

        mF = Match.objects.filter(season=s, matchday=29).first()
        if mF:
            self.stdout.write(self.style.WARNING(f'Final match already exists with id {mF.id}'))
        else:
            mF = Match.objects.create(season=s, home_team=homeF, away_team=awayF, match_date=now + timedelta(days=2), matchday=29)
            self.stdout.write(self.style.SUCCESS(f'Created final match id {mF.id}'))
