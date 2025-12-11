from django.core.management.base import BaseCommand
from django.db.models import Count
import json

from league.models import Match


class Command(BaseCommand):
    help = 'Report matchday assignment statistics for Match objects'

    def handle(self, *args, **options):
        total = Match.objects.count()
        missing = Match.objects.filter(matchday__isnull=True).count()
        counts = list(Match.objects.values('matchday').annotate(c=Count('id')).order_by('matchday'))
        examples = list(
            Match.objects.filter(matchday__isnull=True)
            .values('id', 'home_team__name', 'away_team__name', 'match_date')[:50]
        )

        self.stdout.write(f"TOTAL_MATCHES: {total}")
        self.stdout.write(f"MISSING_MATCHDAY: {missing}")
        self.stdout.write("MATCHDAY_COUNTS:")
        self.stdout.write(json.dumps(counts, default=str, indent=2))
        self.stdout.write("EXAMPLES_MISSING (up to 50):")
        self.stdout.write(json.dumps(examples, default=str, indent=2))
