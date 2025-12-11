from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from league.models import Match, Team
import csv
import os
from django.utils import timezone

class Command(BaseCommand):
    help = 'Apply awarded results (3-0) to matches listed in a CSV file. Use --dry-run to preview.'

    def add_arguments(self, parser):
        parser.add_argument('csvfile', type=str, help='Path to CSV file (match_id,reason,winner)')
        parser.add_argument('--dry-run', action='store_true', help='Do not write changes; only report')
        parser.add_argument('--user', type=str, default='', help='Admin username for audit')

    def handle(self, *args, **options):
        path = options['csvfile']
        dry_run = options['dry_run']
        admin_user = options['user']

        if not os.path.exists(path):
            raise CommandError('CSV file not found: %s' % path)

        actions = []
        with open(path, newline='') as csvf:
            reader = csv.DictReader(csvf)
            for row in reader:
                mid = row.get('match_id') or row.get('id') or row.get('match')
                if not mid:
                    self.stderr.write('Missing match_id in row: %s' % row)
                    continue
                try:
                    mid = int(mid)
                except ValueError:
                    self.stderr.write('Invalid match_id: %s' % mid)
                    continue
                reason = (row.get('reason') or '').strip().lower()
                winner = (row.get('winner') or '').strip().lower()
                if reason not in ('protest', 'walkover'):
                    self.stderr.write(f'Unknown reason for match {mid}: {reason}; skipping')
                    continue
                if winner not in ('home', 'away') and winner != '':
                    try:
                        team_id = int(winner)
                        winner = 'team:%d' % team_id
                    except Exception:
                        self.stderr.write(f'Unknown winner for match {mid}: {winner}; skipping')
                        continue
                actions.append((mid, reason, winner))

        if not actions:
            self.stdout.write('No valid actions found in CSV.')
            return

        if dry_run:
            self.stdout.write('DRY RUN - the following changes would be applied:')
            for mid, reason, winner in actions:
                m = Match.objects.filter(id=mid).first()
                if not m:
                    self.stdout.write(f'  Match {mid} NOT FOUND')
                    continue
                self.stdout.write(f'  Match {mid}: {m.home_team} vs {m.away_team} @ {m.match_date} -> reason={reason}, winner={winner}')
            return

        applied = []
        with transaction.atomic():
            for mid, reason, winner in actions:
                m = Match.objects.select_for_update().filter(id=mid).first()
                if not m:
                    self.stderr.write(f'Match {mid} not found; skipping')
                    continue
                # Backup originals
                m.original_home_score = m.home_score
                m.original_away_score = m.away_score
                # Determine awarded scores
                if winner == 'home' or (winner.startswith('team:') and int(winner.split(':',1)[1]) == m.home_team_id):
                    new_home, new_away = 3, 0
                    awarded_to = m.home_team
                else:
                    new_home, new_away = 0, 3
                    awarded_to = m.away_team
                m.home_score = new_home
                m.away_score = new_away
                m.is_played = True
                m.awarded = True
                m.awarded_reason = reason
                m.awarded_to = awarded_to
                m.awarded_at = timezone.now()
                m.awarded_by = admin_user
                m.save()
                applied.append(m.id)
        self.stdout.write(f'Applied awards to {len(applied)} matches.')
