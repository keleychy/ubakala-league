from collections import defaultdict
from .models import Team, Match

def compute_standings(season_id):
    teams = Team.objects.all()
    stats = {t.id: {
        'team_id': t.id,
        'team_name': t.name,
        'played': 0,
        'wins': 0,
        'draws': 0,
        'losses': 0,
        'goals_for': 0,
        'goals_against': 0,
        'goal_diff': 0,
        'points': 0,
    } for t in teams}

    # Only count the latest played match per team pair (home/away) in the season
    matches = Match.objects.filter(season_id=season_id, is_played=True).order_by('home_team_id', 'away_team_id', '-match_date', '-awarded')
    seen_pairs = set()
    for m in matches:
        pair = tuple(sorted([m.home_team_id, m.away_team_id]))
        if pair in seen_pairs:
            continue
        seen_pairs.add(pair)
        home = stats[m.home_team_id]
        away = stats[m.away_team_id]
        hs = m.home_score or 0
        as_ = m.away_score or 0

        home['played'] += 1
        away['played'] += 1
        home['goals_for'] += hs
        home['goals_against'] += as_
        away['goals_for'] += as_
        away['goals_against'] += hs

        if hs > as_:
            home['wins'] += 1
            home['points'] += 3
            away['losses'] += 1
        elif hs < as_:
            away['wins'] += 1
            away['points'] += 3
            home['losses'] += 1
        else:
            home['draws'] += 1
            away['draws'] += 1
            home['points'] += 1
            away['points'] += 1

    for k, v in stats.items():
        v['goal_diff'] = v['goals_for'] - v['goals_against']

    # Convert to list and sort
    standings = list(stats.values())
    standings.sort(key=lambda x: (-x['points'], -x['goal_diff'], -x['goals_for'], x['team_name']))
    return standings
