
from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import (
    ExcelImportView,
    ManualTeamGroupView,
    groups_for_season,
    groups_with_teams,
    move_team,
    grouped_standings,
    teams_for_season,
    group_team_modify,
)
from .views_rbac import UserRoleViewSet

router = DefaultRouter()
router.register(r'user-roles', UserRoleViewSet, basename='user-role')


urlpatterns = [
    path('import-excel/', ExcelImportView.as_view(), name='import-excel'),
    path('manual-team-group/', ManualTeamGroupView.as_view(), name='manual-team-group'),
    path('groups/', groups_for_season, name='groups-for-season'),
    path('groups-with-teams/', groups_with_teams, name='groups-with-teams'),
    path('move-team/', move_team, name='move-team'),
    path('grouped-standings/', grouped_standings, name='grouped-standings'),
    path('teams/', teams_for_season, name='teams-for-season'),
    path('group-team/', group_team_modify, name='group-team-modify'),
]

urlpatterns += router.urls
