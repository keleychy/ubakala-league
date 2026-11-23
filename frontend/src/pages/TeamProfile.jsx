import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/api';
import {
  formatMatchSchedule,
  getCompetitionCategoryLabel,
  getLagosDateKey,
  getMatchDateKey,
  getMatchStatusCode,
  isFinalMatch
} from '../utils/competition';
import { normalizeTeamProfileArchive } from '../utils/teamProfileArchive';
import './LeaguePolish.css';
import './TeamProfile.css';

const COMPLETED_STATUSES = new Set(['FINISHED', 'AWARDED']);
const NON_UPCOMING_STATUSES = new Set([
  'FINISHED', 'AWARDED', 'VOID', 'CANCELLED', 'ABANDONED'
]);
const TEAM_FIXTURE_LIMIT = 5;

function normalizeCategoryId(category) {
  return String(category || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
}

function getTeamId(match, side) {
  const team = match[`${side}_team`];
  return String(match[`${side}_team_id`] ?? team?.id ?? team ?? '');
}

function getTeamMatches(matches, teamId) {
  return matches.filter(match =>
    getTeamId(match, 'home') === teamId || getTeamId(match, 'away') === teamId
  );
}

function getConfirmedChampion(match) {
  const status = getMatchStatusCode(match);
  if (!isFinalMatch(match) || !['FINISHED', 'AWARDED'].includes(status)) {
    return null;
  }

  if (status === 'AWARDED') {
    const winnerId = String(match.awarded_winner_team_id || '');
    if (winnerId && winnerId === getTeamId(match, 'home')) return 'home';
    if (winnerId && winnerId === getTeamId(match, 'away')) return 'away';
    return null;
  }

  const homeScore = Number(match.home_score);
  const awayScore = Number(match.away_score);
  if (
    match.home_score === null || match.home_score === undefined || match.home_score === '' ||
    match.away_score === null || match.away_score === undefined || match.away_score === '' ||
    !Number.isSafeInteger(homeScore) || !Number.isSafeInteger(awayScore)
  ) {
    return null;
  }
  if (homeScore > awayScore) return 'home';
  if (awayScore > homeScore) return 'away';

  const homePenalties = Number(match.home_penalties ?? match.penalty_home);
  const awayPenalties = Number(match.away_penalties ?? match.penalty_away);
  if (
    Number.isSafeInteger(homePenalties) &&
    Number.isSafeInteger(awayPenalties) &&
    homePenalties !== awayPenalties
  ) {
    return homePenalties > awayPenalties ? 'home' : 'away';
  }
  return null;
}

function sortByMatchDate(matches, direction) {
  return [...matches].sort((first, second) => {
    const firstDate = getMatchDateKey(first) || '';
    const secondDate = getMatchDateKey(second) || '';
    const dateOrder = firstDate.localeCompare(secondDate);
    if (dateOrder !== 0) return dateOrder * direction;
    return String(first.kickoff_time || '').localeCompare(
      String(second.kickoff_time || '')
    ) * direction;
  });
}

function getTeamSeasonRecord(matches, teamId) {
  return matches.reduce((record, match) => {
    if (!['FINISHED', 'AWARDED'].includes(getMatchStatusCode(match))) return record;
    const homeScore = Number(match.home_score);
    const awayScore = Number(match.away_score);
    if (
      match.home_score === null || match.home_score === undefined || match.home_score === '' ||
      match.away_score === null || match.away_score === undefined || match.away_score === '' ||
      !Number.isSafeInteger(homeScore) || homeScore < 0 ||
      !Number.isSafeInteger(awayScore) || awayScore < 0
    ) {
      return record;
    }

    const isHomeTeam = getTeamId(match, 'home') === teamId;
    const isAwayTeam = getTeamId(match, 'away') === teamId;
    if (!isHomeTeam && !isAwayTeam) return record;
    const teamScore = isHomeTeam ? homeScore : awayScore;
    const opponentScore = isHomeTeam ? awayScore : homeScore;

    record.played += 1;
    record.goalsFor += teamScore;
    record.goalsAgainst += opponentScore;
    if (teamScore > opponentScore) record.wins += 1;
    else if (teamScore < opponentScore) record.losses += 1;
    else record.draws += 1;
    return record;
  }, {
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0
  });
}

function getFinalResultEvidence(match) {
  if (getMatchStatusCode(match) === 'AWARDED') {
    return 'Winner recorded by award';
  }

  const homeScore = Number(match.home_score);
  const awayScore = Number(match.away_score);
  const score = `Final score: ${homeScore}–${awayScore}`;
  if (homeScore !== awayScore) return score;

  const homePenalties = Number(match.home_penalties ?? match.penalty_home);
  const awayPenalties = Number(match.away_penalties ?? match.penalty_away);
  return Number.isSafeInteger(homePenalties) &&
    Number.isSafeInteger(awayPenalties) &&
    homePenalties !== awayPenalties
    ? `${score}; penalties ${homePenalties}–${awayPenalties}`
    : score;
}

function MatchList({ title, matches, emptyMessage, seasonsById }) {
  return (
    <section className="team-profile-panel" aria-label={title}>
      <h2>{title}</h2>
      {matches.length > 0 ? (
        <ul className="team-profile-match-list">
          {matches.map(match => {
            const home = match.home_team?.name || match.home_team_name || 'Home team';
            const away = match.away_team?.name || match.away_team_name || 'Away team';
            const seasonId = match.season_id ||
              (typeof match.season === 'object'
                ? match.season?.id
                : match.season);
            const rawCategory = match.season?.category ||
              match.category ||
              seasonsById.get(String(seasonId))?.category;
            const categoryLabel = rawCategory
              ? getCompetitionCategoryLabel(rawCategory)
              : null;
            const isCompleted = COMPLETED_STATUSES.has(getMatchStatusCode(match));
            const score = isCompleted
              ? `${match.home_score ?? '-'}–${match.away_score ?? '-'}`
              : getMatchStatusCode(match) === 'POSTPONED'
                ? 'Postponed'
                : 'Upcoming';

            return (
              <li key={match.id}>
                <Link to={`/results?matchId=${encodeURIComponent(match.id)}`}>
                  <span className="team-profile-match-teams">{home} vs {away}</span>
                  {categoryLabel && (
                    <span className="team-profile-match-category">{categoryLabel}</span>
                  )}
                  <span className="team-profile-match-meta">
                    <time>{formatMatchSchedule(match)}</time>
                    <strong>{score}</strong>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="team-profile-empty">{emptyMessage}</p>
      )}
    </section>
  );
}

export default function TeamProfile() {
  const { id = '' } = useParams();
  const teamId = decodeURIComponent(id);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [recordSeasonYear, setRecordSeasonYear] = useState('');
  const [recordCategory, setRecordCategory] = useState('all');

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [teams, matches, seasons, groupsWithTeams, archiveResponse] = await Promise.all([
        api.getTeams(),
        api.getMatches(),
        api.getSeasons(),
        api.getGroupsWithTeams(),
        fetch('/archive/2025.json')
      ]);
      if (!archiveResponse.ok) {
        throw new Error(`Could not load the 2025 team archive (${archiveResponse.status}).`);
      }
      const archive = normalizeTeamProfileArchive(
        await archiveResponse.json(),
        teams
      );
      setData({
        teams,
        matches: [...matches, ...archive.matches],
        seasons: [...seasons, ...archive.seasons],
        groupsWithTeams,
        unmatchedArchiveTeamNames: archive.unmatchedTeamNames
      });
    } catch (loadError) {
      setError(loadError.message || 'Unable to load this team profile.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile, loadAttempt]);

  const team = data?.teams.find(item => item.id === teamId);
  const teamMatches = useMemo(
    () => team ? getTeamMatches(data?.matches || [], teamId) : [],
    [data, team, teamId]
  );
  const upcomingMatches = useMemo(() => {
    const today = getLagosDateKey();
    return sortByMatchDate(
      teamMatches.filter(match => {
        const dateKey = getMatchDateKey(match);
        return dateKey >= today &&
          !NON_UPCOMING_STATUSES.has(getMatchStatusCode(match));
      }),
      1
    ).slice(0, TEAM_FIXTURE_LIMIT);
  }, [teamMatches]);
  const recentResults = useMemo(() => {
    const today = getLagosDateKey();
    return sortByMatchDate(
      teamMatches.filter(match =>
        COMPLETED_STATUSES.has(getMatchStatusCode(match)) &&
        (getMatchDateKey(match) || '') <= today
      ),
      -1
    ).slice(0, TEAM_FIXTURE_LIMIT);
  }, [teamMatches]);
  const memberships = useMemo(() => {
    if (!team || !data) return [];
    const seasonsById = new Map(data.seasons.map(season => [season.id, season]));
    return data.groupsWithTeams.flatMap(item => {
      if (!item.teams.some(member => member.id === team.id)) return [];
      const season = seasonsById.get(item.group.season_id);
      return [{
        id: `${item.group.season_id}-${item.group.id}`,
        seasonId: item.group.season_id,
        category: season?.category
          ? getCompetitionCategoryLabel(season.category)
          : null,
        season: season?.name,
        group: item.group.name
      }];
    });
  }, [data, team]);
  const seasonsById = useMemo(
    () => new Map((data?.seasons || []).map(season => [String(season.id), season])),
    [data]
  );
  const recordSeasonOptions = useMemo(() => {
    const years = [...new Set((data?.seasons || [])
      .map(season => Number(season.year) || Number(
        String(season.name || '').match(/\b\d{4}\b/)?.[0]
      ))
      .filter(year => Number.isInteger(year) && year > 0))]
      .sort((first, second) => second - first);
    return years.map(year => ({
      value: String(year),
      label: `All seasons ${year}`
    }));
  }, [data]);
  const selectedRecordSeasonYear = recordSeasonYear ||
    recordSeasonOptions[0]?.value || '';
  const recordCategoryOptions = useMemo(() => {
    const categories = new Map((data?.seasons || [])
      .filter(season => {
        const year = Number(season.year) || Number(
          String(season.name || '').match(/\b\d{4}\b/)?.[0]
        );
        return String(year) === selectedRecordSeasonYear;
      })
      .map(season => season.category)
      .filter(Boolean)
      .map(category => [normalizeCategoryId(category), category]));
    return [...categories.keys()].sort((first, second) =>
      getCompetitionCategoryLabel(first).localeCompare(getCompetitionCategoryLabel(second))
    );
  }, [data, selectedRecordSeasonYear]);
  const recordMatches = useMemo(() => {
    const seasonMatches = teamMatches.filter(match => {
      const seasonId = String(match.season_id || match.season?.id || '');
      const season = seasonsById.get(seasonId);
      const year = Number(season?.year) || Number(
        String(season?.name || '').match(/\b\d{4}\b/)?.[0]
      );
      const category = match.category || match.season?.category || season?.category;
      return String(year) === selectedRecordSeasonYear &&
        (recordCategory === 'all' ||
          normalizeCategoryId(category) === recordCategory);
    });
    return getTeamSeasonRecord(seasonMatches, teamId);
  }, [recordCategory, seasonsById, selectedRecordSeasonYear, teamId, teamMatches]);
  const confirmedAchievements = useMemo(() => {
    if (!team || !data) return [];
    return (data.matches || []).flatMap(match => {
      const winnerSide = getConfirmedChampion(match);
      if (!winnerSide || getTeamId(match, winnerSide) !== team.id) return [];

      const seasonId = match.season_id ||
        (typeof match.season === 'object' ? match.season?.id : match.season);
      const season = seasonsById.get(String(seasonId));
      const category = match.season?.category ||
        match.category ||
        season?.category;
      const year = Number(season?.year) || Number(
        String(season?.name || '').match(/\b\d{4}\b/)?.[0]
      );
      const categoryId = String(category || '').toLowerCase().replace(/[\s_]+/g, '-');
      const sourceHref = season?.archived
        ? `/history/${year}?category=${encodeURIComponent(categoryId)}#archive-final-${encodeURIComponent(categoryId)}`
        : `/results?matchId=${encodeURIComponent(match.id)}`;
      return [{
        id: match.id,
        season: season?.name || match.season?.name || 'Recorded season',
        category: category ? getCompetitionCategoryLabel(category) : null,
        date: getMatchDateKey(match),
        evidence: getFinalResultEvidence(match),
        sourceHref,
        sourceLabel: season?.archived ? 'View archived final' : 'View recorded final'
      }];
    }).sort((first, second) =>
      (second.date || '').localeCompare(first.date || '') ||
      first.season.localeCompare(second.season)
    );
  }, [data, seasonsById, team]);

  if (loading) {
    return <div className="league-page-empty" role="status">Loading team profile…</div>;
  }

  if (error) {
    return (
      <div className="league-polish-page">
        <main className="league-polish-content">
          <div className="league-page-status league-page-status--error" role="alert">
            {error}
          </div>
          <button type="button" onClick={() => setLoadAttempt(attempt => attempt + 1)}>
            Try again
          </button>
        </main>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="league-polish-page">
        <main className="league-polish-content">
          <header className="league-page-header">
            <h1 className="league-page-title">Team not found</h1>
            <p className="league-page-subtitle">This team profile is not available.</p>
          </header>
          <Link to="/">Return to the homepage</Link>
        </main>
      </div>
    );
  }

  return (
    <div className="league-polish-page">
      <main className="league-polish-content team-profile">
        <Link className="team-profile-back" to="/">← All teams</Link>
        <header className="league-page-header team-profile-header">
          <div className="team-profile-emblem" aria-hidden="true">
            {team.logo
              ? <img src={team.logo} alt="" />
              : team.name.split(/\s+/).filter(Boolean).slice(0, 2)
                .map(word => word.charAt(0)).join('').toUpperCase()}
          </div>
          <div className="league-page-header__copy">
            <div className="league-page-eyebrow">Team profile</div>
            <h1 className="league-page-title">{team.name}</h1>
            {team.home_community && (
              <p className="league-page-subtitle">{team.home_community}</p>
            )}
          </div>
        </header>

        {(team.profile_description || team.profile_history) && (
          <section className="team-profile-panel" aria-label="About the team">
            {team.profile_description && (
              <div>
                <h2>About the team</h2>
                <p className="team-profile-copy">{team.profile_description}</p>
              </div>
            )}
            {team.profile_history && (
              <div>
                <h2>Team-reported history and achievements</h2>
                <p className="team-profile-copy">{team.profile_history}</p>
              </div>
            )}
          </section>
        )}

        <section className="team-profile-panel" aria-label="Season record">
          <div className="team-profile-record-heading">
            <div>
              <h2>Season record</h2>
              <p className="team-profile-record-note">
                Counts completed or awarded matches with a recorded score.
              </p>
            </div>
            <label className="team-profile-season-select">
              <span>Season</span>
              <select
                aria-label="Season record season"
                value={selectedRecordSeasonYear}
                onChange={event => {
                  setRecordSeasonYear(event.target.value);
                  setRecordCategory('all');
                }}
              >
                {recordSeasonOptions.map(season => (
                  <option key={season.value} value={season.value}>
                    {season.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="team-profile-season-select">
              <span>Category</span>
              <select
                aria-label="Season record category"
                value={recordCategory}
                onChange={event => setRecordCategory(event.target.value)}
              >
                <option value="all">All categories</option>
                {recordCategoryOptions.map(category => (
                  <option key={category} value={category}>
                    {getCompetitionCategoryLabel(category)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {recordMatches.played > 0 ? (
            <dl className="team-profile-record-stats">
              {[
                ['Played', recordMatches.played],
                ['Wins', recordMatches.wins],
                ['Draws', recordMatches.draws],
                ['Losses', recordMatches.losses],
                ['Goals for', recordMatches.goalsFor],
                ['Goals against', recordMatches.goalsAgainst],
                ['Goal difference', recordMatches.goalsFor - recordMatches.goalsAgainst]
              ].map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>
                    {label === 'Goal difference' && value > 0 ? `+${value}` : value}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="team-profile-empty">
              No completed, scored matches are recorded for this selection.
            </p>
          )}
          {selectedRecordSeasonYear === '2025' &&
            data.unmatchedArchiveTeamNames.length > 0 && (
              <p className="team-profile-archive-warning" role="status">
                Some archived 2025 teams could not be matched to profiles and are excluded from team records: {data.unmatchedArchiveTeamNames.join(', ')}.
              </p>
            )}
        </section>

        {confirmedAchievements.length > 0 && (
          <section className="team-profile-panel" aria-label="Recorded championship results">
            <h2>Recorded championship results</h2>
            <p className="team-profile-record-note">
              Winners are calculated from recorded final results. Follow a link to review its match result; team-reported history above is not independently verified.
            </p>
            <ul className="team-profile-achievements">
              {confirmedAchievements.map(achievement => (
                <li key={achievement.id}>
                  <span className="team-profile-achievement-mark" aria-hidden="true">★</span>
                  <span>
                    <Link
                      className="team-profile-achievement-link"
                      to={achievement.sourceHref}
                    >
                      {achievement.sourceLabel}
                    </Link>
                    <span className="team-profile-achievement-details">
                      {[achievement.category, achievement.season].filter(Boolean).join(' · ')}
                    </span>
                    <span className="team-profile-achievement-details">
                      {achievement.evidence}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {memberships.length > 0 && (
          <section className="team-profile-panel" aria-label="Competition groups">
            <h2>Competition groups</h2>
            <ul className="team-profile-memberships">
              {memberships.map(item => (
                <li key={item.id}>
                  {[item.category, item.season, item.group]
                    .filter(Boolean)
                    .join(' · ')}
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="team-profile-match-grid">
          <MatchList
            title="Upcoming fixtures"
            matches={upcomingMatches}
            emptyMessage="No upcoming fixtures are currently listed for this team."
            seasonsById={seasonsById}
          />
          <MatchList
            title="Recent results"
            matches={recentResults}
            emptyMessage="No completed results are currently listed for this team."
            seasonsById={seasonsById}
          />
        </div>
      </main>
    </div>
  );
}
