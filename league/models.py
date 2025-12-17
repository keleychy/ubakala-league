from django.db import models
from django.utils import timezone

# --- Models ---
class Team(models.Model):
    name = models.CharField(max_length=100, unique=True)
    short_name = models.CharField(max_length=20, blank=True)
    logo = models.URLField(blank=True)
    archived = models.BooleanField(default=False, help_text="Mark placeholder or retired teams as archived so they don't appear in active lists")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class Season(models.Model):
    name = models.CharField(max_length=50)
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    CATEGORY_CHOICES = [
        ('senior_boys', 'Senior Boys'),
        ('girls', 'Girls'),
        ('junior_boys', 'Junior Boys'),
    ]
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='senior_boys')

    def __str__(self):
        return self.name


class Group(models.Model):
    name = models.CharField(max_length=1)  # 'A', 'B', 'C', 'D'
    category = models.CharField(max_length=20)
    season = models.ForeignKey(Season, on_delete=models.CASCADE)

    def __str__(self):
        return f"Group {self.name} ({self.category}, {self.season.name})"


class TeamGroup(models.Model):
    team = models.ForeignKey(Team, on_delete=models.CASCADE)
    group = models.ForeignKey(Group, on_delete=models.CASCADE)
    season = models.ForeignKey(Season, on_delete=models.CASCADE)

    class Meta:
        unique_together = ('team', 'group', 'season')

    def __str__(self):
        return f"{self.team.name} in Group {self.group.name} ({self.season.name})"



class Match(models.Model):
    season = models.ForeignKey(Season, on_delete=models.CASCADE)
    home_team = models.ForeignKey(Team, related_name='home_matches', on_delete=models.CASCADE)
    away_team = models.ForeignKey(Team, related_name='away_matches', on_delete=models.CASCADE)
    match_date = models.DateTimeField()
    venue = models.CharField(max_length=200, blank=True)
    home_score = models.IntegerField(null=True, blank=True)
    away_score = models.IntegerField(null=True, blank=True)
    # Penalty shootout scores (for knockout matches)
    penalty_home = models.IntegerField(null=True, blank=True, help_text="Home team penalty score if decided on penalties")
    penalty_away = models.IntegerField(null=True, blank=True, help_text="Away team penalty score if decided on penalties")
    is_played = models.BooleanField(default=False)
    matchday = models.IntegerField(null=True, blank=True, help_text="Optional matchday/round number.")

    # Awarded match metadata
    awarded = models.BooleanField(default=False, help_text="True if match was awarded by protest or walkover.")
    awarded_reason = models.CharField(max_length=20, blank=True, choices=(('protest','Protest'),('walkover','Walkover')))
    awarded_to = models.ForeignKey(Team, null=True, blank=True, on_delete=models.SET_NULL, related_name='+', help_text="Team awarded the win.")
    original_home_score = models.IntegerField(null=True, blank=True, help_text="Backup of original home score before award.")
    original_away_score = models.IntegerField(null=True, blank=True, help_text="Backup of original away score before award.")
    awarded_at = models.DateTimeField(null=True, blank=True, help_text="When the award was applied.")
    awarded_by = models.CharField(max_length=100, blank=True, help_text="Admin username who applied the award.")
    # Explicit void flag for matches that are voided (teams did not participate, etc.)
    void = models.BooleanField(default=False, help_text="True if match was voided (e.g., both teams did not participate)")
    # Manual finish metadata: set when an admin/user marks a match finished manually
    manual_finished_at = models.DateTimeField(null=True, blank=True, help_text="Timestamp when match was manually marked finished")
    extra_time_minutes = models.IntegerField(null=True, blank=True, help_text="Extra minutes applied when manually finished")
    manual_finished_by = models.CharField(max_length=150, blank=True, help_text="User who manually marked finished")

    def __str__(self):
        return f"{self.home_team} vs {self.away_team} - {self.match_date.date()}"

    def save(self, *args, **kwargs):
        """
        Automatically mark a match as played when both scores are present
        and the match datetime is in the past. If either score is cleared
        or the match datetime is in the future, `is_played` will be set to False.
        """
        # If manually finished, preserve that as played regardless of scores
        if self.manual_finished_at:
            self.is_played = True
        else:
            # Default to not played
            self.is_played = False
            if self.home_score is not None and self.away_score is not None:
                try:
                    now = timezone.now()
                    if self.match_date is not None and self.match_date <= now:
                        self.is_played = True
                except Exception:
                    # If there's any issue comparing dates, do not mark as played
                    self.is_played = False
        super().save(*args, **kwargs)

    def get_match_stage(self):
        """Determine if match is group stage or knockout based on matchday or presence of group."""
        from .models import Group, TeamGroup
        
        # If matchday >= 21, it's knockout
        if self.matchday is not None and self.matchday >= 21:
            # Map matchday to stage name
            stage_map = {
                22: 'Quarterfinal', 23: 'Quarterfinal', 24: 'Quarterfinal', 25: 'Quarterfinal',
                26: 'Semifinal', 27: 'Semifinal',
                28: 'Third Place',
                29: 'Final',
            }
            return stage_map.get(self.matchday, 'Knockout')
        
        # Check if both teams are in a group for this season
        home_in_group = TeamGroup.objects.filter(team=self.home_team, season=self.season).exists()
        away_in_group = TeamGroup.objects.filter(team=self.away_team, season=self.season).exists()
        
        if home_in_group and away_in_group:
            return 'Group Stage'
        
        return 'Knockout'


class News(models.Model):
    title = models.CharField(max_length=200)
    content = models.TextField()
    published_at = models.DateTimeField(auto_now_add=True)
    image_url = models.URLField(blank=True)

    def __str__(self):
        return self.title
