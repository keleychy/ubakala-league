import { normalizeTeamProfileArchive } from './teamProfileArchive';
import archivedSeason from '../../public/archive/2025.json';

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

test('matches every team name in the real 2025 archive to the provided team directory', () => {
  const teams = [
    { id: 'TEAM-UMUOSU', name: 'Umuosu' },
    { id: 'TEAM-EZIAMA', name: 'Eziama' },
    { id: 'TEAM-AVODIM', name: 'Avodim' },
    { id: 'TEAM-AMIBO', name: 'Amibo' },
    { id: 'TEAM-AMUZU', name: 'Amuzu' },
    { id: 'TEAM-NSUKWE', name: 'Nsukwe' },
    { id: 'TEAM-EZU-N-ERIM', name: "Ezu N'Erim" },
    { id: 'TEAM-UMUOGO', name: 'Umuogo' },
    { id: 'TEAM-MGBARAKUMA', name: 'Mgbarakuma' },
    { id: 'TEAM-UMUMBA', name: 'Umumba' },
    { id: 'TEAM-UTURU', name: 'Uturu' },
    { id: 'TEAM-ABAM', name: 'Abam' },
    { id: 'TEAM-NSIRIMO-AUT', name: 'Nsirimo Aut' },
    { id: 'TEAM-IPUPE', name: 'Ipupe' },
    { id: 'TEAM-LAGURU', name: 'Laguru' },
    { id: 'TEAM-CHOCURL', name: 'Chocurl' },
    { id: 'TEAM-DIAMOND-ALL-STARS', name: 'Diamond All Stars' }
  ];

  const normalized = normalizeTeamProfileArchive(archivedSeason, teams);

  expect(normalized.matches).toHaveLength(86);
  expect(normalized.unmatchedTeamNames).toEqual([]);
  expect(normalized.matches.every(match =>
    match.home_team_id && match.away_team_id
  )).toBe(true);
});
