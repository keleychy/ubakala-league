from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from django.utils import timezone
from django.core.management import call_command
from django.db import transaction


def _replace_placeholders_for_match(match):
    """When a match is completed, replace any placeholder teams referencing
    WINNER <matchday> or LOSER <matchday> with the actual Team objects
    in subsequent matches for the same season.
    """
    try:
        from .models import Team, Match
    except Exception:
        return

    matchnum = getattr(match, 'matchday', None)
    if not matchnum:
        return

    # Determine winner and loser; if draw, try penalties or awarded_to
    hs = match.home_score or 0
    as_ = match.away_score or 0
    winner = None
    loser = None
    if hs != as_:
        winner = match.home_team if hs > as_ else match.away_team
        loser = match.away_team if hs > as_ else match.home_team
    else:
        # check penalty fields
        ph = getattr(match, 'penalty_home', None)
        pa = getattr(match, 'penalty_away', None)
        if ph is not None and pa is not None and ph != pa:
            winner = match.home_team if ph > pa else match.away_team
            loser = match.away_team if ph > pa else match.home_team
        else:
            # fallback to awarded_to if admin set it
            at = getattr(match, 'awarded_to', None)
            if at is not None:
                winner = at
                loser = match.away_team if at == match.home_team else match.home_team
            else:
                # cannot determine winner automatically
                return

    winner_name = f"WINNER {matchnum} (placeholder)"
    loser_name = f"LOSER {matchnum} (placeholder)"

    # perform updates in a transaction
    with transaction.atomic():
        wp = Team.objects.filter(name=winner_name).first()
        if wp:
            # update matches where this placeholder appears
            Match.objects.filter(season=match.season, home_team=wp).update(home_team=winner)
            Match.objects.filter(season=match.season, away_team=wp).update(away_team=winner)

        lp = Team.objects.filter(name=loser_name).first()
        if lp:
            Match.objects.filter(season=match.season, home_team=lp).update(home_team=loser)
            Match.objects.filter(season=match.season, away_team=lp).update(away_team=loser)

        # After replacing placeholders, remove placeholder Team records to keep team list clean
        try:
            Team.objects.filter(name__icontains=f"WINNER {matchnum} (placeholder)").delete()
        except Exception:
            pass
        try:
            Team.objects.filter(name__icontains=f"LOSER {matchnum} (placeholder)").delete()
        except Exception:
            pass


@receiver(pre_save)
def match_pre_save(sender, instance, **kwargs):
    # Only act on Match model (avoid importing here to keep generic)
    if sender.__name__ != 'Match':
        return
    # initialize previous-state flags
    if not instance.pk:
        instance._pre_awarded = False
        instance._pre_played = False
        return
    try:
        old = sender.objects.get(pk=instance.pk)
        instance._pre_awarded = getattr(old, 'awarded', False)
        instance._pre_played = getattr(old, 'is_played', False)
    except sender.DoesNotExist:
        instance._pre_awarded = False
        instance._pre_played = False


@receiver(post_save)
def match_post_save(sender, instance, created, **kwargs):
    if sender.__name__ != 'Match':
        return

    prev_awarded = getattr(instance, '_pre_awarded', False)
    # If match has just been marked awarded, apply award logic
    if instance.awarded and not prev_awarded:
        # Backup original scores into any known backup fields (do via queryset update to avoid recursion)
        orig_home = getattr(instance, 'home_score', None)
        orig_away = getattr(instance, 'away_score', None)

        update_fields = {}
        for field_name in ('original_home_score', 'orig_home_score', 'backup_home_score'):
            if hasattr(instance, field_name):
                update_fields[field_name] = orig_home
        for field_name in ('original_away_score', 'orig_away_score', 'backup_away_score'):
            if hasattr(instance, field_name):
                update_fields[field_name] = orig_away

        # Determine awarded score assignment
        awarded_to = getattr(instance, 'awarded_to', None)
        if awarded_to is not None:
            try:
                # compare by pk to be safe
                if awarded_to.pk == instance.home_team_id:
                    update_fields['home_score'] = 3
                    update_fields['away_score'] = 0
                elif awarded_to.pk == instance.away_team_id:
                    update_fields['home_score'] = 0
                    update_fields['away_score'] = 3
            except Exception:
                # fallback: string comparison
                if str(awarded_to) == str(getattr(instance, 'home_team', '')):
                    update_fields['home_score'] = 3
                    update_fields['away_score'] = 0
                elif str(awarded_to) == str(getattr(instance, 'away_team', '')):
                    update_fields['home_score'] = 0
                    update_fields['away_score'] = 3

        # set awarded_at if exists
        if hasattr(instance, 'awarded_at'):
            update_fields['awarded_at'] = timezone.now()

        # if award reason indicates a walkover, mark match as played
        award_reason = getattr(instance, 'award_reason', None) or getattr(instance, 'awarded_reason', None)
        if award_reason and isinstance(award_reason, str) and 'walkover' in award_reason.lower():
            if hasattr(instance, 'is_played'):
                update_fields['is_played'] = True
            elif hasattr(instance, 'played'):
                update_fields['played'] = True

        # ensure awarded flag is true in DB (in case it was set via admin but not saved before)
        update_fields['awarded'] = True

        if update_fields:
            sender.objects.filter(pk=instance.pk).update(**update_fields)

        # Recompute standings (calls management command that already exists)
        try:
            call_command('recompute_standings')
        except Exception:
            # don't raise on signal failures
            pass
    # If the match has just been marked as played (not played before), try resolving placeholders
    prev_played = getattr(instance, '_pre_played', False)
    now_played = getattr(instance, 'is_played', False)
    if now_played and not prev_played:
        try:
            _replace_placeholders_for_match(instance)
            # recompute standings after replacements
            call_command('recompute_standings')
        except Exception:
            pass


@receiver(post_save, sender=Match)
def auto_populate_next_stage_on_knockout_played(sender, instance, created, **kwargs):
    """Automatically populate next stage teams when a knockout match is marked as played."""
    
    # Only process matches that are part of knockout stages (matchday >= 22)
    if instance.matchday is None or instance.matchday < 22:
        return
    
    # Only run if match is marked as played
    if not instance.is_played:
        return
    
    # Check if this is any of the competition seasons (Girls, Junior Boys, Senior Boys)
    if instance.season and any(keyword in instance.season.name.upper() for keyword in ['GIRLS', 'JUNIOR BOYS', 'SENIOR BOYS']):
        try:
            # Run the populate_next_stage command
            call_command('populate_next_stage')
        except Exception:
            # Silently fail to avoid breaking the save operation
            pass
