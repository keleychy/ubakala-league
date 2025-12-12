import sqlite3
conn = sqlite3.connect('db.sqlite3')
cur = conn.cursor()
cur.execute("SELECT id, name FROM league_season WHERE category='junior_boys'")
rows = cur.fetchall()
if not rows:
    print('NO_SEASON')
else:
    for r in rows:
        print(r[0], r[1])
conn.close()
