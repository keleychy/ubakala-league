from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone


class Command(BaseCommand):
    help = "Set award on a single match: backup original scores (if fields present), set new scores, and mark awarded."

    def add_arguments(self, parser):
        parser.add_argument('match_id', type=int)
        parser.add_argument('--home-score', type=int, required=True)
        parser.add_argument('--away-score', type=int, required=True)
        parser.add_argument('--awarded-to', type=str, required=True, help='Team name that is awarded the match')
        parser.add_argument('--reason', type=str, default='award')

    def handle(self, *args, **options):
        from league.models import Match, Team

        match_id = options['match_id']
        home_score = options['home_score']
        away_score = options['away_score']
        awarded_to_name = options['awarded_to']
        reason = options['reason']

        try:
            match = Match.objects.get(id=match_id)
        except Match.DoesNotExist:
            raise CommandError(f"Match with id {match_id} does not exist")

        try:
            awarded_team = Team.objects.get(name=awarded_to_name)
        except Team.DoesNotExist:
            raise CommandError(f"Team with name '{awarded_to_name}' does not exist")

        # Backup original scores into any known backup fields if present
        orig_home = getattr(match, 'home_score', None)
        orig_away = getattr(match, 'away_score', None)
        for field_name in ('original_home_score', 'orig_home_score', 'backup_home_score'):
            if hasattr(match, field_name):
                setattr(match, field_name, orig_home)
        for field_name in ('original_away_score', 'orig_away_score', 'backup_away_score'):
            if hasattr(match, field_name):
                setattr(match, field_name, orig_away)

        # Set new scores
        if hasattr(match, 'home_score'):
            match.home_score = home_score
        else:
            raise CommandError('Model does not have `home_score` field')
        if hasattr(match, 'away_score'):
            match.away_score = away_score
        else:
            raise CommandError('Model does not have `away_score` field')

        # Mark awarded
        if hasattr(match, 'awarded'):
            match.awarded = True
        else:
            # fallback: try award flag names
            if hasattr(match, 'is_awarded'):
                match.is_awarded = True

        # set awarded_to if present
        if hasattr(match, 'awarded_to'):
            match.awarded_to = awarded_team
        elif hasattr(match, 'awarded_team'):
            match.awarded_team = awarded_team

        # set award reason (handle different names)
        if hasattr(match, 'award_reason'):
            match.award_reason = reason
        elif hasattr(match, 'awarded_reason'):
            match.awarded_reason = reason

        # set awarded_at if exists
        if hasattr(match, 'awarded_at'):
            match.awarded_at = timezone.now()

        # If this is a walkover, mark match as played
        if isinstance(reason, str) and reason.strip().lower() == 'walkover':
            if hasattr(match, 'is_played'):
                match.is_played = True
            elif hasattr(match, 'played'):
                match.played = True

        match.save()

        self.stdout.write(self.style.SUCCESS(f"Match {match_id} updated: score {home_score}-{away_score}, awarded to {awarded_to_name}"))
