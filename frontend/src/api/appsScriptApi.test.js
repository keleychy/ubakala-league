import { createAppsScriptApi } from './appsScriptApi';

function response(data, success = true) {
  return {
    ok: true,
    json: async () => success
      ? { success: true, data }
      : { success: false, error: data }
  };
}

describe('Apps Script read API', () => {
  const endpoint = 'https://script.google.com/macros/s/test/exec';

  test('unwraps success envelopes and preserves IDs as strings', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(response([
      { id: 123, name: 'Avodim', short_name: '', logo: '', archived: 'FALSE' }
    ]));
    const client = createAppsScriptApi(endpoint, fetchImpl);

    await expect(client.getTeams()).resolves.toEqual([
      {
        id: '123',
        name: 'Avodim',
        short_name: null,
        logo: null,
        archived: false
      }
    ]);

    expect(new URL(fetchImpl.mock.calls[0][0]).searchParams.get('action')).toBe('teams');
  });

  test('passes category and season filters using the sheet API query names', async () => {
    const fetchImpl = jest.fn()
      .mockResolvedValueOnce(response([]))
      .mockResolvedValueOnce(response([]));
    const client = createAppsScriptApi(endpoint, fetchImpl);

    await client.getSeasons('INTERMEDIATE');
    await client.getMatches({ season: 'UFC26-INTERMEDIATE' });

    const seasonsUrl = new URL(fetchImpl.mock.calls[0][0]);
    const matchesUrl = new URL(fetchImpl.mock.calls[1][0]);
    expect(seasonsUrl.searchParams.get('action')).toBe('seasons');
    expect(seasonsUrl.searchParams.get('category')).toBe('intermediate');
    expect(matchesUrl.searchParams.get('action')).toBe('matches');
    expect(matchesUrl.searchParams.get('season_id')).toBe('UFC26-INTERMEDIATE');
  });

  test('filters categories locally when the API returns every season', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(response([
      { id: 'season-1', name: 'Junior', category: 'junior_boys' },
      { id: 'season-2', name: 'Senior', category: 'senior_boys' }
    ]));
    const client = createAppsScriptApi(endpoint, fetchImpl);

    await expect(client.getSeasons('senior_boys')).resolves.toMatchObject([
      { id: 'season-2', category: 'senior_boys' }
    ]);
  });

  test('joins groups, team assignments and teams using supported API actions', async () => {
    const fetchImpl = jest.fn()
      .mockResolvedValueOnce(response([
        { id: 'group-a', season_id: 'season-1', name: 'A' },
        { id: 'group-b', season_id: 'season-2', name: 'B' }
      ]))
      .mockResolvedValueOnce(response([
        { id: 'assignment-1', season_id: 'season-1', group_id: 'group-a', team_id: 'TEAM-1' },
        { id: 'assignment-2', season_id: 'season-2', group_id: 'group-b', team_id: 'TEAM-1' }
      ]))
      .mockResolvedValueOnce(response([
        { id: 'TEAM-1', name: 'Avodim', short_name: 'Avodim', logo: '', archived: 'FALSE' }
      ]));
    const client = createAppsScriptApi(endpoint, fetchImpl);

    await expect(client.getGroupsWithTeams('season-1')).resolves.toEqual([{
      group: { id: 'group-a', name: 'A' },
      teams: [{
        id: 'TEAM-1',
        name: 'Avodim',
        short_name: 'Avodim',
        logo: null,
        archived: false
      }]
    }]);
    await client.getGroupsWithTeams('season-1');
    const actions = fetchImpl.mock.calls.map(([url]) => new URL(url).searchParams.get('action'));
    expect(actions).toEqual(['groups', 'teamgroups', 'teams']);
  });

  test('normalizes match types without inferring played status', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(response([{
      id: 'UFC26-SENIOR-M030',
      season_id: 'UFC26-SENIOR',
      season: { id: 'UFC26-SENIOR', name: 'Senior Boys 2026', category: 'senior_boys' },
      group_id: '',
      group: null,
      match_number: '30',
      stage: 'FINAL',
      match_date: '2026-12-20',
      kickoff_time: '16:00',
      kickoff_at: '2026-12-20T16:00:00+01:00',
      home_team_id: 'TEAM-1',
      away_team_id: '',
      home_team_name: 'Avodim',
      away_team_name: 'Winner 27',
      home_team: { id: 'TEAM-1', name: 'Avodim' },
      away_team: { id: null, name: 'Winner 27' },
      home_score: '2',
      away_score: '',
      home_penalties: '5',
      away_penalties: '',
      status: 'PENDING',
      current_period: '',
      is_played: true
    }]));
    const client = createAppsScriptApi(endpoint, fetchImpl);
    const [match] = await client.getMatches({ season_id: 'UFC26-SENIOR' });

    expect(match.id).toBe('UFC26-SENIOR-M030');
    expect(match.match_number).toBe(30);
    expect(match.matchday).toBe(30);
    expect(match.stage).toBe('FINAL');
    expect(match.match_date).toBe('2026-12-20');
    expect(match.kickoff_time).toBe('16:00');
    expect(match.home_score).toBe(2);
    expect(match.away_score).toBeNull();
    expect(match.penalty_home).toBe(5);
    expect(match.penalty_away).toBeNull();
    expect(match.home_team.id).toBe('TEAM-1');
    expect(match.away_team).toEqual({ id: null, name: 'Winner 27' });
    expect(match.status).toBe('PENDING');
    expect(match.current_period).toBeNull();
    expect(match).not.toHaveProperty('is_played');
  });

  test('filters matches locally when the API returns all seasons', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(response([
      { id: 'match-1', season_id: 'season-1', match_number: '1' },
      { id: 'match-2', season_id: 'season-2', match_number: '1' }
    ]));
    const client = createAppsScriptApi(endpoint, fetchImpl);

    await expect(client.getMatches({ season: 'season-2' })).resolves.toMatchObject([
      { id: 'match-2', season_id: 'season-2' }
    ]);
  });

  test('returns only published news items and keeps created timestamps distinct', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(response([
      {
        id: 12,
        title: 'Published',
        content: '<p>Update</p>',
        image_url: '',
        published: 'TRUE',
        created_at: '2026-10-20 10:00',
        updated_at: ''
      },
      {
        id: 13,
        title: 'Draft',
        content: 'Not public',
        published: 'FALSE',
        created_at: '',
        updated_at: ''
      }
    ]));
    const client = createAppsScriptApi(endpoint, fetchImpl);

    await expect(client.getNews()).resolves.toEqual([
      {
        id: '12',
        title: 'Published',
        content: '<p>Update</p>',
        image_url: null,
        published: true,
        created_at: '2026-10-20 10:00',
        updated_at: null
      }
    ]);
    expect(new URL(fetchImpl.mock.calls[0][0]).searchParams.get('action')).toBe('news');
  });

  test('requests a single published news record by string ID', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(response({
      id: 'news-01',
      title: 'Update',
      content: 'Published item',
      published: true,
      created_at: '2026-10-20'
    }));
    const client = createAppsScriptApi(endpoint, fetchImpl);

    await expect(client.getNewsById('news-01')).resolves.toMatchObject({
      id: 'news-01',
      published: true
    });
    const url = new URL(fetchImpl.mock.calls[0][0]);
    expect(url.searchParams.get('action')).toBe('news');
    expect(url.searchParams.get('id')).toBe('news-01');
  });

  test('surfaces failed API envelopes', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(response('Unknown action', false));
    const client = createAppsScriptApi(endpoint, fetchImpl);

    await expect(client.getTeams()).rejects.toThrow('Unknown action');
  });
});
