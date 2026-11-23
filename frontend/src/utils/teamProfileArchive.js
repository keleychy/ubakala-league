function normalizeTeamName(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

function getArchivedTeamNameKeys(name) {
  const key = normalizeTeamName(name);
  if (key === 'NSIRIMOAUTONOMOUS') return ['NSIRIMOAUT'];
  return [key];
}

function createTeamIdLookup(teams) {
  const teamIds = new Map();
  const ambiguousNames = new Set();
  teams.forEach(team => {
    [team.name, team.short_name].filter(Boolean).forEach(name => {
      getArchivedTeamNameKeys(name).forEach(key => {
        if (!key || ambiguousNames.has(key)) return;
        if (teamIds.has(key) && teamIds.get(key) !== team.id) {
          teamIds.delete(key);
          ambiguousNames.add(key);
          return;
        }
        teamIds.set(key, team.id);
      });
    });
  });
  return teamIds;
}

export function normalizeTeamProfileArchive(archive, teams) {
  if (!archive || !Array.isArray(archive.categories)) {
    throw new Error('The archived season data does not contain categories.');
  }

  const teamIds = createTeamIdLookup(teams);
  const seasons = [];
  const matches = [];

  archive.categories.forEach(category => {
    if (!category || !Array.isArray(category.matches)) {
      throw new Error('An archived competition category has invalid match data.');
    }

    const seasonId = `archive-${archive.season || 2025}-${category.id}`;
    const season = {
      id: seasonId,
      name: category.season_name || `${archive.season || 2025} ${category.name}`,
      category: category.id,
      year: Number(archive.season || 2025),
      archived: true
    };
    seasons.push(season);

    category.matches.forEach((match, index) => {
      const homeTeamId = getArchivedTeamNameKeys(match.home_team)
        .map(key => teamIds.get(key))
        .find(Boolean) || null;
      const awayTeamId = getArchivedTeamNameKeys(match.away_team)
        .map(key => teamIds.get(key))
        .find(Boolean) || null;
      matches.push({
        id: `${seasonId}-match-${index + 1}`,
        season_id: seasonId,
        season,
        category: category.id,
        stage: match.stage,
        matchday: match.matchday,
        match_date: match.date,
        status: match.void ? 'VOID' : match.awarded ? 'AWARDED' : 'FINISHED',
        home_team_id: homeTeamId,
        away_team_id: awayTeamId,
        home_team_name: match.home_team || '',
        away_team_name: match.away_team || '',
        home_team: { id: homeTeamId, name: match.home_team || '' },
        away_team: { id: awayTeamId, name: match.away_team || '' },
        home_score: match.home_score,
        away_score: match.away_score,
        home_penalties: match.penalty_home,
        away_penalties: match.penalty_away,
        awarded: match.awarded === true,
        venue: match.venue
      });
    });
  });

  return { seasons, matches };
}
