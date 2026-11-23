import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/api';
import {
  formatMatchSchedule,
  getCompetitionCategoryLabel,
  getLagosDateKey,
  getMatchDateKey,
  getMatchStatusCode
} from '../utils/competition';
import './LeaguePolish.css';
import './TeamProfile.css';

const COMPLETED_STATUSES = new Set(['FINISHED', 'AWARDED']);
const NON_UPCOMING_STATUSES = new Set([
  'FINISHED', 'AWARDED', 'VOID', 'CANCELLED', 'ABANDONED'
]);
const TEAM_FIXTURE_LIMIT = 5;

function getTeamId(match, side) {
  const team = match[`${side}_team`];
  return String(match[`${side}_team_id`] ?? team?.id ?? team ?? '');
}

function getTeamMatches(matches, teamId) {
  return matches.filter(match =>
    getTeamId(match, 'home') === teamId || getTeamId(match, 'away') === teamId
  );
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

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [teams, matches, seasons, groupsWithTeams] = await Promise.all([
        api.getTeams(),
        api.getMatches(),
        api.getSeasons(),
        api.getGroupsWithTeams()
      ]);
      setData({
        teams,
        matches,
        seasons,
        groupsWithTeams
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
                <h2>History and achievements</h2>
                <p className="team-profile-copy">{team.profile_history}</p>
              </div>
            )}
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
