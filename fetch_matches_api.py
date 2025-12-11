import requests
r = requests.get('http://127.0.0.1:8000/api/matches/')
print('status', r.status_code)
data = r.json()
# find junior season id
jun = None
for m in data:
    s = m.get('season')
    name = s.get('name') if isinstance(s, dict) else None
    if name and 'JUNIOR' in name.upper():
        jun = s['id'] if isinstance(s, dict) else s
        break
print('found junior season id', jun)
if jun:
    jm = [m for m in data if (m.get('season', {}).get('id') if isinstance(m.get('season'), dict) else m.get('season'))==jun]
    jm_sorted = sorted(jm, key=lambda x: int(x.get('matchday') or 0))
    for m in jm_sorted:
        if int(m.get('matchday') or 0) >= 26:
            home = m['home_team']['name'] if isinstance(m['home_team'], dict) else m['home_team']
            away = m['away_team']['name'] if isinstance(m['away_team'], dict) else m['away_team']
            print(m['id'], m['matchday'], home, 'vs', away)
else:
    print('No junior season matches found')
