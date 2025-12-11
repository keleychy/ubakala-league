from django.core.management.base import BaseCommand, CommandError
from datetime import datetime
from django.utils import timezone


class Command(BaseCommand):
    help = 'Regenerate Girls knockout bracket with correct group-qualified fixtures and dates'

    def handle(self, *args, **options):
        from league.models import Season, Group, TeamGroup, Team, Match

        season = Season.objects.filter(name__icontains='GIRLS').first()
        if not season:
            raise CommandError("Season 'GIRLS' not found")

        self.stdout.write(f'Regenerating bracket for {season.name}...')

        # Correct bracket structure per user specification
        fixtures = [
            # Quarterfinals
            ('QF1', '1ST A', '2ND B', '12/1/2025 2:00 PM', 22),
            ('QF2', '1ST C', '2ND D', '12/3/2025 2:00 PM', 23),
            ('QF3', '1ST B', '2ND A', '12/5/2025 2:00 PM', 24),
            ('QF4', '1ST D', '2ND C', '12/7/2025 2:00 PM', 25),
            # Semifinals
            ('SF1', 'WINNER 22', 'WINNER 23', '12/10/2025 2:00 PM', 26),
            ('SF2', 'WINNER 24', 'WINNER 25', '12/12/2025 2:00 PM', 27),
            # Third place
            ('3rd', 'LOSER 26', 'LOSER 27', '12/31/2025 10:00 AM', 28),
            # Final
            ('Final', 'WINNER 26', 'WINNER 27', '01/01/2026 2:00 PM', 29),
        ]

        def get_qualified_teams():
            """Get qualified teams (1ST and 2ND) from each group based on match results."""
            from league.models import TeamGroup, Match
            from collections import defaultdict
            
            qualified = {}  # e.g. qualified['A'] = {'1ST': Team, '2ND': Team}
            
            groups = Group.objects.filter(season=season)
            for grp in groups:
                # Get all teams in this group
                team_groups = TeamGroup.objects.filter(group=grp, season=season)
                teams = [tg.team for tg in team_groups]
                
                # Calculate standings for this group
                standings = defaultdict(lambda: {'points': 0, 'gf': 0, 'ga': 0})
                
                for match in Match.objects.filter(season=season, matchday__lt=21):
                    if match.home_team in teams and match.away_team in teams:
                        if not match.is_played or match.void:
                            continue
                        
                        home_score = match.home_score or 0
                        away_score = match.away_score or 0
                        
                        standings[match.home_team]['gf'] += home_score
                        standings[match.home_team]['ga'] += away_score
                        standings[match.away_team]['gf'] += away_score
                        standings[match.away_team]['ga'] += home_score
                        
                        if home_score > away_score:
                            standings[match.home_team]['points'] += 3
                        elif away_score > home_score:
                            standings[match.away_team]['points'] += 3
                        else:
                            standings[match.home_team]['points'] += 1
                            standings[match.away_team]['points'] += 1
                
                # Sort teams by points, goal difference, goals for
                sorted_teams = sorted(teams, key=lambda t: (
                    -standings[t]['points'],
                    -(standings[t]['gf'] - standings[t]['ga']),
                    -standings[t]['gf']
                ))
                
                if len(sorted_teams) >= 1:
                    qualified[grp.name] = {'1ST': sorted_teams[0]}
                if len(sorted_teams) >= 2:
                    qualified[grp.name]['2ND'] = sorted_teams[1]
                
                self.stdout.write(f'Group {grp.name}: 1ST={sorted_teams[0].name if len(sorted_teams) >= 1 else "N/A"} ({standings[sorted_teams[0]]["points"]}pts), 2ND={sorted_teams[1].name if len(sorted_teams) >= 2 else "N/A"} ({standings[sorted_teams[1]]["points"]}pts)')
            
            return qualified

        def resolve_participant(token, qualified_teams):
            """Resolve a token like '1ST A' or 'WINNER 22' to a Team object."""
            token = token.strip()
            
            # Pattern: '1ST A', '2ND B', etc. -> resolve from qualified standings
            parts = token.split()
            if len(parts) == 2 and parts[0].upper() in ('1ST', '2ND') and len(parts[1]) == 1:
                pos = parts[0].upper()
                group_name = parts[1].upper()
                
                if group_name not in qualified_teams or pos not in qualified_teams[group_name]:
                    raise CommandError(f"Qualified team {pos} from group {group_name} not found")
                
                return qualified_teams[group_name][pos]
            
            # Pattern: 'WINNER 22', 'LOSER 27', etc. -> use placeholders
            if len(parts) >= 2:
                kind = parts[0].upper()
                try:
                    matchday = int(parts[1])
                    if kind == 'WINNER':
                        name = f"WINNER {matchday} (placeholder)"
                    elif kind == 'LOSER':
                        name = f"LOSER {matchday} (placeholder)"
                    else:
                        raise CommandError(f"Unknown token: {token}")
                    short = name[:20]
                    team, _ = Team.objects.get_or_create(name=name, defaults={'short_name': short, 'archived': True})
                    return team
                except (ValueError, IndexError):
                    pass
            
            raise CommandError(f"Could not parse participant token: {token}")

        # Get qualified teams from group stage standings
        qualified_teams = get_qualified_teams()

        created = 0
        for label, home_token, away_token, date_str, matchday in fixtures:
            try:
                home_team = resolve_participant(home_token, qualified_teams)
                away_team = resolve_participant(away_token, qualified_teams)
                
                # Parse date: e.g. '12/1/2025 2:00 PM'
                match_dt = datetime.strptime(date_str, '%m/%d/%Y %I:%M %p')
                # Make it UTC-aware using stdlib timezone
                from datetime import timezone as dt_timezone
                match_dt = match_dt.replace(tzinfo=dt_timezone.utc)
                
                match, created_flag = Match.objects.get_or_create(
                    season=season,
                    home_team=home_team,
                    away_team=away_team,
                    matchday=matchday,
                    defaults={
                        'match_date': match_dt,
                        'venue': '',
                        'is_played': False,
                    }
                )
                if created_flag:
                    created += 1
                    self.stdout.write(f'Created {label} (MD{matchday}): {home_token} vs {away_token} on {date_str}')
                else:
                    self.stdout.write(f'Match {label} (MD{matchday}) already exists')
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Error creating {label}: {e}'))

        self.stdout.write(self.style.SUCCESS(f'✓ Generated {created} new knockout matches for {season.name}'))
