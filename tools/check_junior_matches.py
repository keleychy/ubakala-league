import sqlite3

conn = sqlite3.connect('db.sqlite3')
cur = conn.cursor()
cur.execute("SELECT id,name FROM league_season WHERE category='junior_boys'")
se = cur.fetchall()
print('seasons:', se)
if se:
    sid = se[0][0]
    cur.execute('SELECT id,home_team_id,away_team_id,match_date,matchday FROM league_match WHERE season_id=? AND matchday IN (28,29)', (sid,))
    rows = cur.fetchall()
    print('matches for season id', sid, rows)
    team_ids = set()
    for r in rows:
        team_ids.update([r[1], r[2]])
    print('team_ids', team_ids)
    if team_ids:
        cur.execute('SELECT id,name,archived FROM league_team WHERE id IN ({seq})'.format(seq=','.join('?'*len(team_ids))), tuple(team_ids))
        print('teams', cur.fetchall())
conn.close()
