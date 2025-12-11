from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = 'Replace senior boys quarterfinal participants with positional placeholders if group stages are incomplete.'

    def add_arguments(self, parser):
        parser.add_argument('season_name', type=str)

    def handle(self, *args, **options):
        from league.models import Season, Group, TeamGroup, Team, Match

        season_name = options['season_name']
        season = Season.objects.filter(name__iexact=season_name).first()
        if not season:
            raise CommandError(f"Season '{season_name}' not found")

        if season.category != 'senior_boys':
            self.stdout.write(self.style.WARNING('This command is intended for senior_boys seasons only.'))

        # Quarterfinal matchday numbers used by the generator
        qf_matchdays = [22, 23, 24, 25]

        replaced = 0
        for md in qf_matchdays:
            # find match(es) with this matchday
            matches = Match.objects.filter(season=season, matchday=md)
            for m in matches:
                # Determine token for home and away based on matchday mapping in generator
                # mapping: 22 -> ('1ST A','2ND B'), 23 -> ('1ST C','2ND D'), 24 -> ('1ST B','2ND A'), 25 -> ('1ST D','2ND C')
                mapping = {
                    22: ('1ST A', '2ND B'),
                    23: ('1ST C', '2ND D'),
                    24: ('1ST B', '2ND A'),
                    25: ('1ST D', '2ND C'),
                }
                if md not in mapping:
                    continue
                left_tok, right_tok = mapping[md]

                # determine group and check if group matches complete
                def placeholder_for(token):
                    parts = token.split()
                    pos = parts[0].upper()
                    group_name = parts[1].upper()
                    grp = Group.objects.filter(name=group_name, season=season).first()
                    if not grp:
                        return None
                    tgs = TeamGroup.objects.filter(group=grp, season=season)
                    team_ids = [tg.team_id for tg in tgs]
                    n = len(team_ids)
                    expected = n * (n - 1) // 2 if n > 1 else 0
                    played = Match.objects.filter(season=season, is_played=True, home_team_id__in=team_ids, away_team_id__in=team_ids).count()
                    if played < expected:
                        name = f"{pos} {group_name} (placeholder)"
                        short = name[:20]
                        team, _ = Team.objects.get_or_create(name=name, defaults={'short_name': short, 'archived': True})
                        return team
                    return None

                left_ph = placeholder_for(left_tok)
                right_ph = placeholder_for(right_tok)

                changed = False
                if left_ph and m.home_team_id != left_ph.id:
                    m.home_team = left_ph
                    changed = True
                if right_ph and m.away_team_id != right_ph.id:
                    m.away_team = right_ph
                    changed = True
                if changed:
                    m.save()
                    replaced += 1
                    self.stdout.write(self.style.SUCCESS(f"Replaced participants on match {m.id} (matchday {md}) with placeholders."))

        self.stdout.write(self.style.SUCCESS(f"Finished. Replaced participants on {replaced} matches."))
