from rest_framework import serializers
from datetime import timedelta
from .models import Team, Season, Match, News

class TeamSerializer(serializers.ModelSerializer):
    class Meta:
        model = Team
        fields = '__all__'

class SeasonSerializer(serializers.ModelSerializer):
    class Meta:
        model = Season
        fields = '__all__'

class MatchSerializer(serializers.ModelSerializer):
    home_team = TeamSerializer()
    away_team = TeamSerializer()
    season = SeasonSerializer()
    match_stage = serializers.SerializerMethodField()
    match_date = serializers.DateTimeField(format="%Y-%m-%dT%H:%M:%S%z")
    
    def get_match_stage(self, obj):
        return obj.get_match_stage()
    
    def to_representation(self, instance):
        # Get the default representation
        ret = super().to_representation(instance)
        # Subtract 1 hour from match_date for local time adjustment
        if ret['match_date']:
            try:
                match_date = instance.match_date
                adjusted_date = match_date - timedelta(hours=1)
                ret['match_date'] = adjusted_date.strftime("%Y-%m-%dT%H:%M:%S%z")
            except:
                pass
        return ret
    
    class Meta:
        model = Match
        fields = '__all__'

class MatchCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Match
        fields = '__all__'

    def validate_current_period(self, value):
        """Ensure the provided current_period is one of the model choices."""
        allowed = [k for k, _ in Match.CURRENT_PERIOD_CHOICES]
        if value not in allowed:
            raise serializers.ValidationError('Invalid period value')
        return value

class NewsSerializer(serializers.ModelSerializer):
    class Meta:
        model = News
        fields = '__all__'
