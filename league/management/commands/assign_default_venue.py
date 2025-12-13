from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Assign 'UBAKALA MAIN FIELD' to matches with no venue"

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true', help='Show changes but do not write')

    def handle(self, *args, **options):
        from league.models import Match

        dry_run = options.get('dry_run')
        matches = Match.objects.filter(venue__exact='')
        total = matches.count()
        if total == 0:
            self.stdout.write(self.style.SUCCESS('No matches without a venue found.'))
            return

        self.stdout.write(f"Found {total} matches with empty venue. Assigning 'UBAKALA MAIN FIELD'.")
        changed = 0
        for m in matches:
            if dry_run:
                self.stdout.write(f"Would set venue for match {m.id}: {m.home_team} vs {m.away_team}")
            else:
                m.venue = 'UBAKALA MAIN FIELD'
                m.save()
                changed += 1

        if dry_run:
            self.stdout.write(self.style.SUCCESS('Dry run complete. No changes written.'))
        else:
            self.stdout.write(self.style.SUCCESS(f'Assigned venue on {changed} matches.'))
