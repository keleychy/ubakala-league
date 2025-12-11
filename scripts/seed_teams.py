from league.models import Team, Season, Group, TeamGroup

teams = [
    "AMUZU",
    "EZU N'ERIM",
    "IPUPE",
    "AVODIM",
    "NZUKWE",
    "UTURU",
    "UMUMBA",
    "UMUOGO",
    "UMUOSU",
    "LAGURU",
    "MGBARAKUMA",
    "UMUAKO",
    "ABAM",
    "AMIBO",
    "EZIAMA",
]

season = Season.objects.filter(id=1).first()
if not season:
    print('Season id=1 not found; aborting')
else:
    groups = list(Group.objects.filter(season=season).order_by('name'))
    if not groups:
        print('No groups found for season', season)
    else:
        created_teams = 0
        created_assignments = 0
        for i, name in enumerate(teams):
            team, t_created = Team.objects.get_or_create(name=name)
            if t_created:
                created_teams += 1
            group = groups[i % len(groups)]
            tg, tg_created = TeamGroup.objects.get_or_create(team=team, group=group, season=season)
            if tg_created:
                created_assignments += 1
            print(f"Assigned {team.name} -> Group {group.name} (season {season.name})")
        print(f"Done. Created teams: {created_teams}, created assignments: {created_assignments}")
