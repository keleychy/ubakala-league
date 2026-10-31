function normalizeText(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text === '' ? null : text;
}

function requiredId(value, fieldName) {
  const id = normalizeText(value);
  if (id === null) throw new Error(`${fieldName} is required`);
  return id;
}

function normalizeNumber(value, fieldName) {
  const text = normalizeText(value);
  if (text === null) return null;
  const number = Number(text);
  if (!Number.isFinite(number)) {
    throw new Error(`${fieldName} must be numeric`);
  }
  return number;
}

function normalizeBoolean(value, fieldName) {
  if (value === true || value === false) return value;
  const text = normalizeText(value);
  if (text === null) return null;
  if (text.toLowerCase() === 'true' || text === '1') return true;
  if (text.toLowerCase() === 'false' || text === '0') return false;
  throw new Error(`${fieldName} must be boolean`);
}

function normalizeTeam(team) {
  return {
    id: requiredId(team.id, 'Teams.id'),
    name: normalizeText(team.name) || '',
    short_name: normalizeText(team.short_name),
    logo: normalizeText(team.logo),
    archived: normalizeBoolean(team.archived, 'Teams.archived')
  };
}

function normalizeSeason(season) {
  return {
    id: requiredId(season.id, 'Seasons.id'),
    name: normalizeText(season.name) || '',
    category: normalizeText(season.category)?.toLowerCase() || null,
    year: normalizeNumber(season.year, 'Seasons.year'),
    active: normalizeBoolean(season.active, 'Seasons.active'),
    archived: normalizeBoolean(season.archived, 'Seasons.archived')
  };
}

function normalizeGroup(group) {
  return {
    id: requiredId(group.id, 'Groups.id'),
    season_id: requiredId(group.season_id, 'Groups.season_id'),
    name: normalizeText(group.name) || ''
  };
}

function normalizeTeamGroup(item) {
  return {
    id: requiredId(item.id, 'TeamGroups.id'),
    season_id: requiredId(item.season_id, 'TeamGroups.season_id'),
    group_id: requiredId(item.group_id, 'TeamGroups.group_id'),
    team_id: requiredId(item.team_id, 'TeamGroups.team_id')
  };
}

function normalizeReference(reference) {
  if (!reference) return null;
  return {
    ...reference,
    id: normalizeText(reference.id),
    name: normalizeText(reference.name)
  };
}

function normalizeMatch(match) {
  const stage = normalizeText(match.stage ?? match.match_stage);
  const homeTeam = normalizeReference(match.home_team);
  const awayTeam = normalizeReference(match.away_team);
  const homeTeamId = normalizeText(match.home_team_id ?? homeTeam?.id);
  const awayTeamId = normalizeText(match.away_team_id ?? awayTeam?.id);
  const homeTeamName =
    normalizeText(match.home_team_name ?? homeTeam?.name) || '';
  const awayTeamName =
    normalizeText(match.away_team_name ?? awayTeam?.name) || '';

  const normalized = {
    ...match,
    id: requiredId(match.id, 'Matches.id'),
    season_id: requiredId(match.season_id ?? match.season?.id ?? match.season, 'Matches.season_id'),
    season: normalizeReference(match.season),
    group_id: normalizeText(match.group_id ?? match.group?.id),
    group: normalizeReference(match.group),
    match_number: normalizeNumber(match.match_number, 'Matches.match_number'),
    matchday: normalizeNumber(match.matchday ?? match.match_number, 'Matches.match_number'),
    stage,
    match_stage: stage,
    match_date: normalizeText(match.match_date),
    kickoff_time: normalizeText(match.kickoff_time),
    kickoff_at: normalizeText(match.kickoff_at),
    home_team_id: homeTeamId,
    away_team_id: awayTeamId,
    home_team_name: homeTeamName,
    away_team_name: awayTeamName,
    home_team: { id: homeTeamId, name: homeTeamName },
    away_team: { id: awayTeamId, name: awayTeamName },
    home_score: normalizeNumber(match.home_score, 'Matches.home_score'),
    away_score: normalizeNumber(match.away_score, 'Matches.away_score'),
    home_penalties: normalizeNumber(match.home_penalties ?? match.penalty_home, 'Matches.home_penalties'),
    away_penalties: normalizeNumber(match.away_penalties ?? match.penalty_away, 'Matches.away_penalties'),
    penalty_home: normalizeNumber(match.penalty_home ?? match.home_penalties, 'Matches.home_penalties'),
    penalty_away: normalizeNumber(match.penalty_away ?? match.away_penalties, 'Matches.away_penalties'),
    status: normalizeText(match.status),
    current_period: normalizeText(match.current_period)
  };
  delete normalized.is_played;
  return normalized;
}

function normalizeNews(item) {
  return {
    id: requiredId(item.id, 'News.id'),
    title: normalizeText(item.title) || '',
    subtitle: normalizeText(item.subtitle),
    content: normalizeText(item.content) || '',
    author: normalizeText(item.author),
    image_url: normalizeText(item.image_url),
    published: normalizeBoolean(item.published, 'News.published'),
    created_at: normalizeText(item.created_at),
    published_at: normalizeText(item.published_at) || normalizeText(item.created_at),
    updated_at: normalizeText(item.updated_at)
  };
}

function requireArray(data, resource) {
  if (!Array.isArray(data)) {
    throw new Error(`Apps Script ${resource} response must contain an array`);
  }
  return data;
}

export function createAppsScriptApi(baseUrl, fetchImpl = fetch) {
  const endpoint = normalizeText(baseUrl);
  if (!endpoint) {
    throw new Error('REACT_APP_APPS_SCRIPT_API_URL is required for the Apps Script provider');
  }
  const groupsWithTeamsCache = new Map();

  async function getAction(action, parameters = {}) {
    const url = new URL(endpoint);
    url.searchParams.set('action', action);
    Object.entries(parameters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });

    const response = await fetchImpl(url.toString());
    if (!response.ok) {
      const body = await response.text();
      throw new Error(body || `Apps Script request failed (${response.status})`);
    }

    const payload = await response.json();
    if (!payload || payload.success !== true) {
      throw new Error(payload?.error || 'Apps Script request failed');
    }
    return payload.data;
  }

  return {
    async getTeams() {
      return requireArray(await getAction('teams'), 'teams').map(normalizeTeam);
    },
    async getSeasons(category) {
      const seasons = requireArray(
        await getAction('seasons', { category: category?.toLowerCase() }),
        'seasons'
      ).map(normalizeSeason);
      const normalizedCategory = normalizeText(category)?.toLowerCase();
      return normalizedCategory
        ? seasons.filter(season => season.category === normalizedCategory)
        : seasons;
    },
    async getGroups(seasonId) {
      const groups = requireArray(
        await getAction('groups', { season_id: seasonId }),
        'groups'
      ).map(normalizeGroup);
      const selectedSeason = normalizeText(seasonId);
      return selectedSeason
        ? groups.filter(group => group.season_id === selectedSeason)
        : groups;
    },
    async getTeamGroups(seasonId) {
      const assignments = requireArray(
        await getAction('teamgroups', { season_id: seasonId }),
        'teamgroups'
      ).map(normalizeTeamGroup);
      const selectedSeason = normalizeText(seasonId);
      return selectedSeason
        ? assignments.filter(item => item.season_id === selectedSeason)
        : assignments;
    },
    async getGroupsWithTeams(seasonId) {
      const selectedSeason = normalizeText(seasonId);
      const cacheKey = selectedSeason || '';
      if (groupsWithTeamsCache.has(cacheKey)) {
        return groupsWithTeamsCache.get(cacheKey);
      }

      const request = (async () => {
        const [allGroups, allTeamGroups, teams] = await Promise.all([
          getAction('groups', { season_id: seasonId }).then(data =>
            requireArray(data, 'groups').map(normalizeGroup)
          ),
          getAction('teamgroups', { season_id: seasonId }).then(data =>
            requireArray(data, 'teamgroups').map(normalizeTeamGroup)
          ),
          getAction('teams').then(data =>
            requireArray(data, 'teams').map(normalizeTeam)
          )
        ]);
        const groups = selectedSeason
          ? allGroups.filter(group => group.season_id === selectedSeason)
          : allGroups;
        const teamGroups = selectedSeason
          ? allTeamGroups.filter(item => item.season_id === selectedSeason)
          : allTeamGroups;
        const teamsById = new Map(teams.map(team => [team.id, team]));
        const teamsByGroup = new Map(groups.map(group => [group.id, []]));

        teamGroups.forEach(assignment => {
          const groupTeams = teamsByGroup.get(assignment.group_id);
          const team = teamsById.get(assignment.team_id);
          if (!groupTeams) {
            throw new Error(`Team assignment references unknown group ${assignment.group_id}`);
          }
          if (!team) {
            throw new Error(`Team assignment references unknown team ${assignment.team_id}`);
          }
          groupTeams.push(team);
        });

        return groups.map(group => ({
          group: { id: group.id, name: group.name },
          teams: teamsByGroup.get(group.id)
        }));
      })();
      groupsWithTeamsCache.set(cacheKey, request);
      try {
        return await request;
      } catch (error) {
        groupsWithTeamsCache.delete(cacheKey);
        throw error;
      }
    },
    async getMatches(parameters = {}) {
      const matches = requireArray(
        await getAction('matches', {
          season_id: parameters.season_id ?? parameters.season
        }),
        'matches'
      ).map(normalizeMatch);
      const selectedSeason = normalizeText(parameters.season_id ?? parameters.season);
      return selectedSeason
        ? matches.filter(match => match.season_id === selectedSeason)
        : matches;
    },
    async getNews() {
      return requireArray(await getAction('news'), 'news')
        .map(normalizeNews)
        .filter(item => item.published === true);
    },
    async getNewsById(id) {
      const item = await getAction('news', { id });
      if (item === null) return null;
      const news = normalizeNews(item);
      return news.published === true ? news : null;
    }
  };
}
