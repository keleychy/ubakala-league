from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from datetime import datetime


class Command(BaseCommand):
    help = 'Generate knockout bracket matches for a season using a provided bracket layout.'

    def add_arguments(self, parser):
        parser.add_argument('season_name', type=str)
        parser.add_argument('--dry-run', action='store_true', help='Do not write to DB, only show what would be created')

    def handle(self, *args, **options):
        from league.models import Season, Group, TeamGroup, Team, Match

        season_name = options['season_name']
        dry_run = options['dry_run']

        season = Season.objects.filter(name__iexact=season_name).first()
        if not season:
            raise CommandError(f"Season '{season_name}' not found")

        # Bracket provided by user (hardcoded here per request)
        fixtures = [
            # Quarterfinals
            ('QF1', '1ST A', '2ND B', '12/2/2025 2:00 PM', 22),
            ('QF2', '1ST C', '2ND D', '12/4/2025 2:00 PM', 23),
            ('QF3', '1ST B', '2ND A', '12/6/2025 2:00 PM', 24),
            ('QF4', '1ST D', '2ND C', '12/8/2025 2:00 PM', 25),
            # Semifinals (winners of above)
            ('SF1', 'WINNER 22', 'WINNER 23', '12/11/2025 2:00 PM', 26),
            ('SF2', 'WINNER 24', 'WINNER 25', '12/13/2025 2:00 PM', 27),
            # Third place
            ('3rd', 'LOSER 26', 'LOSER 27', '12/31/2025 8:00 AM', 28),
            # Final
            ('Final', 'WINNER 26', 'WINNER 27', '01/01/2026 2:00 PM', 29),
        ]

        # Helper: parse participant token
        def resolve_participant(token):
            token = token.strip()
            # Patterns: '1ST A', '2ND B'
            parts = token.split()
            if len(parts) == 2 and parts[0].upper() in ('1ST', '2ND') and len(parts[1]) == 1:
                pos = 1 if parts[0].upper() == '1ST' else 2
                group_name = parts[1].upper()
                # find group
                grp = Group.objects.filter(name=group_name, season=season).first()
                if not grp:
                    raise CommandError(f"Group '{group_name}' not found for season {season.name}")
                # get teams in group
                tgs = TeamGroup.objects.filter(group=grp, season=season)
                team_ids = [tg.team_id for tg in tgs]
                # If this is the senior boys season and group matches are not yet complete,
                # return a placeholder for the position so we don't prematurely resolve qualifiers.
                # Determine expected number of matches in a single round-robin among n teams: n*(n-1)/2
                try:
                    n = len(team_ids)
                    expected_matches = n * (n - 1) // 2
                    played_matches_count = Match.objects.filter(season=season, is_played=True, home_team_id__in=team_ids, away_team_id__in=team_ids).count()
                except Exception:
                    expected_matches = None
                    played_matches_count = 0

                if season.category == 'senior_boys' and expected_matches is not None and played_matches_count < expected_matches:
                    # Not all group matches completed; return placeholder like '1ST A (placeholder)'
                    name = f"{parts[0].upper()} {group_name} (placeholder)"
                    short = name[:20]
                    team, _ = Team.objects.get_or_create(name=name, defaults={'short_name': short, 'archived': True})
                    return team

                # compute simple standings within group using played matches
                stats = {tid: {'team_id': tid, 'points': 0, 'gf': 0, 'ga': 0} for tid in team_ids}
                matches = Match.objects.filter(season=season, is_played=True, home_team_id__in=team_ids, away_team_id__in=team_ids)
                seen_pairs = set()
                for m in matches.order_by('home_team_id', 'away_team_id', '-match_date'):
                    pair = tuple(sorted([m.home_team_id, m.away_team_id]))
                    if pair in seen_pairs:
                        continue
                    seen_pairs.add(pair)
                    hs = m.home_score or 0
                    aa = m.away_score or 0
                    stats[m.home_team_id]['gf'] += hs
                    stats[m.home_team_id]['ga'] += aa
                    stats[m.away_team_id]['gf'] += aa
                    stats[m.away_team_id]['ga'] += hs
                    if hs > aa:
                        stats[m.home_team_id]['points'] += 3
                    elif hs < aa:
                        stats[m.away_team_id]['points'] += 3
                    else:
                        stats[m.home_team_id]['points'] += 1
                        stats[m.away_team_id]['points'] += 1

                # sort
                standing_list = list(stats.values())
                standing_list.sort(key=lambda x: (-x['points'], -(x['gf'] - x['ga']), -x['gf']))
                if pos - 1 >= len(standing_list):
                    raise CommandError(f"Not enough teams in group {group_name} to resolve {token}")
                team_id = standing_list[pos - 1]['team_id']
                return Team.objects.get(id=team_id)

            # Patterns: WINNER 22, LOSER 26
            if parts[0].upper() in ('WINNER', 'LOSER') and parts[1].isdigit():
                label = f"{parts[0].upper()} {parts[1]}"
                # create or get placeholder Team
                name = f"{label} (placeholder)"
                short = name[:20]
                team, _ = Team.objects.get_or_create(name=name, defaults={'short_name': short, 'archived': True})
                return team

            # Fallback: try to find by exact team name
            team = Team.objects.filter(name__iexact=token).first()
            if team:
                return team
            raise CommandError(f"Cannot resolve participant token: {token}")

        created = []
        for code, left_tok, right_tok, date_str, matchnum in fixtures:
            try:
                # try parse month/day/year
                dt = None
                for fmt in ('%m/%d/%Y %I:%M %p', '%d/%m/%Y %I:%M %p', '%m/%d/%Y %I:%M:%S %p', '%d/%m/%Y %I:%M:%S %p', '%m/%d/%Y'):
                    try:
                        dt = datetime.strptime(date_str, fmt)
                        break
                    except Exception:
                        continue
                if dt is None:
                    raise ValueError(f"Unrecognized date format: {date_str}")

                left = resolve_participant(left_tok)
                right = resolve_participant(right_tok)

                # Avoid duplicate matches: check for season + match_date + same participants
                exists = Match.objects.filter(season=season, match_date=dt, home_team=left, away_team=right).exists()
                if exists:
                    self.stdout.write(self.style.WARNING(f"Match already exists: {left} vs {right} on {dt}"))
                    continue

                if dry_run:
                    self.stdout.write(f"Would create: {code}: {left} vs {right} at {dt} (matchnum {matchnum})")
                else:
                    m = Match.objects.create(season=season, home_team=left, away_team=right, match_date=dt)
                    # store the matchnum in matchday for reference
                    try:
                        m.matchday = matchnum
                        m.save()
                    except Exception:
                        pass
                    created.append(m)
                    self.stdout.write(self.style.SUCCESS(f"Created match {m.id}: {left} vs {right} on {dt}"))
            except Exception as e:
                self.stderr.write(f"Failed to create fixture {code}: {e}")

        self.stdout.write(self.style.SUCCESS(f"Finished. Created {len(created)} matches."))