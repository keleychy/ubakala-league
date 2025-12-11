from django.core.management.base import BaseCommand, CommandError
from league.models import Season, Match, Team


class Command(BaseCommand):
    help = 'Automatically populate next stage teams (SF/Final) based on match results for all seasons'

    def handle(self, *args, **options):
        # Process all seasons that have knockout stages
        season_keywords = ['GIRLS', 'JUNIOR BOYS', 'SENIOR BOYS']
        total_updated = 0
        
        for keyword in season_keywords:
            season = Season.objects.filter(name__icontains=keyword).first()
            if not season:
                self.stdout.write(self.style.WARNING(f"Season containing '{keyword}' not found, skipping"))
                continue
            
            self.stdout.write(f'\nPopulating next stage teams for {season.name}...')
            updated = self._populate_season(season)
            total_updated += updated
        
        self.stdout.write(self.style.SUCCESS(f'\n✓ Total updated: {total_updated} match slots across all seasons'))
    
    def _populate_season(self, season):
        """Populate next stage teams for a given season."""

        updated = 0

        # Process Quarterfinals (MD22-25) -> Semifinals (MD26-27)
        qf_results = {
            22: ('WINNER 22', 'LOSER 26'),  # QF1 winner -> SF1 winner, QF1 loser -> 3rd place loser
            23: ('WINNER 23', 'LOSER 26'),  # QF2 winner -> SF1 winner, QF2 loser -> 3rd place loser
            24: ('WINNER 24', 'LOSER 27'),  # QF3 winner -> SF2 winner, QF3 loser -> 3rd place loser
            25: ('WINNER 25', 'LOSER 27'),  # QF4 winner -> SF2 winner, QF4 loser -> 3rd place loser
        }

        for qf_md, (winner_placeholder, loser_placeholder) in qf_results.items():
            qf_match = Match.objects.filter(season=season, matchday=qf_md).first()
            if not qf_match:
                self.stdout.write(self.style.WARNING(f'MD{qf_md}: Match not found, skipping'))
                continue
            if not qf_match.is_played:
                self.stdout.write(f'MD{qf_md}: Not yet played, skipping')
                continue
            
            self.stdout.write(f'MD{qf_md}: {qf_match.home_team.name} vs {qf_match.away_team.name} - Processed')

            # Determine winner and loser
            if qf_match.penalty_home is not None or qf_match.penalty_away is not None:
                # Penalty shootout
                winner = qf_match.home_team if qf_match.penalty_home > qf_match.penalty_away else qf_match.away_team
                loser = qf_match.away_team if winner == qf_match.home_team else qf_match.home_team
            else:
                # Regular result
                winner = qf_match.home_team if qf_match.home_score > qf_match.away_score else qf_match.away_team
                loser = qf_match.away_team if winner == qf_match.home_team else qf_match.home_team

            # Update winner placeholder in next stage
            # Support placeholder naming variants like 'WINNER 22' and 'WINNER 22 (placeholder)'
            winner_placeholder_team = Team.objects.filter(name__icontains=winner_placeholder).first()
            if winner_placeholder_team:
                affected_matches = Match.objects.filter(
                    season=season,
                    home_team=winner_placeholder_team
                ) | Match.objects.filter(
                    season=season,
                    away_team=winner_placeholder_team
                )
                for m in affected_matches:
                    if m.home_team == winner_placeholder_team and m.away_team != winner:
                        m.home_team = winner
                        m.save()
                        updated += 1
                        self.stdout.write(f'Updated MD{m.matchday} home: {winner.name}')
                    elif m.away_team == winner_placeholder_team and m.home_team != winner:
                        m.away_team = winner
                        m.save()
                        updated += 1
                        self.stdout.write(f'Updated MD{m.matchday} away: {winner.name}')

            # Update loser placeholder (for 3rd place match)
            loser_placeholder_team = Team.objects.filter(name__icontains=loser_placeholder).first()
            if loser_placeholder_team:
                affected_matches = Match.objects.filter(
                    season=season,
                    home_team=loser_placeholder_team
                ) | Match.objects.filter(
                    season=season,
                    away_team=loser_placeholder_team
                )
                for m in affected_matches:
                    if m.home_team == loser_placeholder_team and m.away_team != loser:
                        m.home_team = loser
                        m.save()
                        updated += 1
                        self.stdout.write(f'Updated MD{m.matchday} home: {loser.name}')
                    elif m.away_team == loser_placeholder_team and m.home_team != loser:
                        m.away_team = loser
                        m.save()
                        updated += 1
                        self.stdout.write(f'Updated MD{m.matchday} away: {loser.name}')

        # Process Semifinals (MD26-27) -> Final (MD29) and 3rd Place (MD28)
        sf_results = {
            26: ('WINNER 26', 'LOSER 26'),  # SF1 winner -> Final, SF1 loser -> 3rd place
            27: ('WINNER 27', 'LOSER 27'),  # SF2 winner -> Final, SF2 loser -> 3rd place
        }

        for sf_md, (winner_placeholder, loser_placeholder) in sf_results.items():
            sf_match = Match.objects.filter(season=season, matchday=sf_md).first()
            if not sf_match:
                self.stdout.write(self.style.WARNING(f'MD{sf_md}: Match not found, skipping'))
                continue
            if not sf_match.is_played:
                self.stdout.write(f'MD{sf_md}: Not yet played, skipping')
                continue
            
            self.stdout.write(f'MD{sf_md}: {sf_match.home_team.name} vs {sf_match.away_team.name} - Processed')

            # Determine winner and loser
            if sf_match.penalty_home is not None or sf_match.penalty_away is not None:
                # Penalty shootout
                winner = sf_match.home_team if sf_match.penalty_home > sf_match.penalty_away else sf_match.away_team
                loser = sf_match.away_team if winner == sf_match.home_team else sf_match.home_team
            else:
                # Regular result
                winner = sf_match.home_team if sf_match.home_score > sf_match.away_score else sf_match.away_team
                loser = sf_match.away_team if winner == sf_match.home_team else sf_match.home_team

            # Update winner placeholder in Final
            winner_placeholder_team = Team.objects.filter(name__icontains=winner_placeholder).first()
            if winner_placeholder_team:
                final_match = Match.objects.filter(season=season, matchday=29).first()
                if final_match:
                    if final_match.home_team == winner_placeholder_team and final_match.away_team != winner:
                        final_match.home_team = winner
                        final_match.save()
                        updated += 1
                        self.stdout.write(f'Updated Final home: {winner.name}')
                    elif final_match.away_team == winner_placeholder_team and final_match.home_team != winner:
                        final_match.away_team = winner
                        final_match.save()
                        updated += 1
                        self.stdout.write(f'Updated Final away: {winner.name}')

            # Update loser placeholder in 3rd Place match
            loser_placeholder_team = Team.objects.filter(name__icontains=loser_placeholder).first()
            if loser_placeholder_team:
                third_match = Match.objects.filter(season=season, matchday=28).first()
                if third_match:
                    if third_match.home_team == loser_placeholder_team and third_match.away_team != loser:
                        third_match.home_team = loser
                        third_match.save()
                        updated += 1
                        self.stdout.write(f'Updated 3rd Place home: {loser.name}')
                    elif third_match.away_team == loser_placeholder_team and third_match.home_team != loser:
                        third_match.away_team = loser
                        third_match.save()
                        updated += 1
                        self.stdout.write(f'Updated 3rd Place away: {loser.name}')
        
        return updated
