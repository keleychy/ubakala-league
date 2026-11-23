import { normalizeTeamProfileArchive } from './teamProfileArchive';

test('maps archived team names to current IDs using names, short names, and known aliases', () => {
  const archive = {
    season: 2025,
    categories: [{
      id: 'senior-boys',
      name: 'Senior Boys',
      matches: [{
        stage: 'Final',
        home_team: 'NSIRIMO AUTONOMOUS',
        away_team: "EZIAMA",
        home_score: 2,
        away_score: 0,
        date: '2025-11-30T16:00:00Z'
      }]
    }]
  };
  const teams = [
    { id: 'team-nsirimo', name: 'Nsirimo Aut' },
    { id: 'team-eziama', name: 'Eziama United', short_name: 'Eziama' }
  ];

  const normalized = normalizeTeamProfileArchive(archive, teams);

  expect(normalized.seasons).toEqual([{
    id: 'archive-2025-senior-boys',
    name: '2025 Senior Boys',
    category: 'senior-boys',
    year: 2025,
    archived: true
  }]);
  expect(normalized.matches[0]).toMatchObject({
    season_id: 'archive-2025-senior-boys',
    stage: 'Final',
    status: 'FINISHED',
    home_team_id: 'team-nsirimo',
    away_team_id: 'team-eziama',
    home_score: 2,
    away_score: 0
  });
});
