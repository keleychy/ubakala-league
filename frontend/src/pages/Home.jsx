
import React, { useState, useRef, useEffect } from 'react';
import { api } from '../api/api';
import { Link, useNavigate } from 'react-router-dom';
import './Results.css';
import './Home.css';
import usePolling from '../utils/usePolling';

export default function Home() {
  const [teams, setTeams] = useState([]);
  const [matches, setMatches] = useState([]);
  const [matchesLoading, setMatchesLoading] = useState(true);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [showingTomorrow, setShowingTomorrow] = useState(false);
  const [teamsLoadedOnce, setTeamsLoadedOnce] = useState(false);
  const [matchesLoadedOnce, setMatchesLoadedOnce] = useState(false);
  const [championMap, setChampionMap] = useState({});
  const navigate = useNavigate();
  const prevMatchesRef = useRef({});
  const [flashMap, setFlashMap] = useState({});
  const timeoutRef = useRef(null);
  const FLASH_DURATION = 800;

  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  function formatCountdown(ms) {
    if (ms <= 0) return '0:00';
    const totalSeconds = Math.ceil(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  function getMatchLiveStatus(match) {
    if (match.is_played) {
      return { status: 'ended', label: 'Match ended' };
    }

    const kickoff = new Date(match.match_date);
    if (isNaN(kickoff)) {
      return { status: 'Unknown', label: 'Match time unknown' };
    }

    const elapsedMin = (now - kickoff.getTime()) / 60000;
    const FIRST_HALF = 45;
    const HALF_BREAK = 15;
    const SECOND_HALF_TOTAL = 45;
    const TOTAL_WITH_BREAK = FIRST_HALF + HALF_BREAK + SECOND_HALF_TOTAL;

    if (elapsedMin < 0) {
      return { status: 'not_started', label: 'Match not started' };
    }

    if (elapsedMin < FIRST_HALF) {
      const minute = Math.min(FIRST_HALF, Math.floor(elapsedMin) + 1);
      return {
        status: '1st_half',
        label: `Match ongoing • ${minute}' (1st half)`
      };
    }

    if (elapsedMin < FIRST_HALF + HALF_BREAK) {
      const remainingMs =
        (FIRST_HALF + HALF_BREAK) * 60000 -
        (now - kickoff.getTime());

      return {
        status: 'halftime',
        label: `Half time break • ${formatCountdown(remainingMs)} remaining`
      };
    }

    if (elapsedMin < TOTAL_WITH_BREAK) {
      const secondElapsed = elapsedMin - HALF_BREAK;
      const minute = Math.min(90, Math.floor(secondElapsed) + 1);

      return {
        status: '2nd_half',
        label: `Match ongoing • ${minute}' (2nd half)`
      };
    }

    return { status: 'ended', label: 'Match ended' };
  }

  const PERIOD_LABELS = {
    not_started: 'Not started',
    '1st_half': '1st Half',
    halftime: 'Half Time',
    '2nd_half': '2nd Half',
    ended: 'Ended'
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Retain existing champion detection for the three supported categories.
  useEffect(() => {
    let mounted = true;

    async function loadChampions() {
      try {
        const categories = ['senior_boys', 'girls', 'junior_boys'];
        const map = {};

        await Promise.all(
          categories.map(async (cat) => {
            try {
              const seasons = await api.getSeasons(cat);
              if (!seasons || seasons.length === 0) return;

              const seasonId = seasons[0].id;
              const seasonMatches = await api.getMatches({
                season: seasonId
              });

              if (!seasonMatches || seasonMatches.length === 0) return;

              let finalCandidates = seasonMatches.filter(
                (m) => Number(m.matchday) === 29
              );

              if (finalCandidates.length === 0) {
                const allMd = Array.from(
                  new Set(
                    seasonMatches
                      .map((m) =>
                        m.matchday !== undefined && m.matchday !== null
                          ? Number(m.matchday)
                          : null
                      )
                      .filter((x) => x !== null)
                  )
                ).sort((a, b) => a - b);

                if (allMd.length === 0) return;

                const finalDay = allMd[allMd.length - 1];

                finalCandidates = seasonMatches.filter(
                  (m) => Number(m.matchday) === finalDay
                );
              }

              const finalMatch =
                finalCandidates.find(
                  (m) =>
                    m.home_score !== null &&
                    m.away_score !== null &&
                    m.home_score !== m.away_score
                ) ||
                finalCandidates.find(
                  (m) =>
                    m.penalty_home !== null ||
                    m.penalty_away !== null
                ) ||
                finalCandidates[0];

              if (!finalMatch) return;

              let winnerId = null;

              if (
                finalMatch.home_score !== null &&
                finalMatch.away_score !== null &&
                finalMatch.home_score !== finalMatch.away_score
              ) {
                winnerId =
                  finalMatch.home_score > finalMatch.away_score
                    ? finalMatch.home_team?.id || finalMatch.home_team
                    : finalMatch.away_team?.id || finalMatch.away_team;
              } else if (
                finalMatch.penalty_home !== null &&
                finalMatch.penalty_away !== null &&
                finalMatch.penalty_home !== finalMatch.penalty_away
              ) {
                winnerId =
                  finalMatch.penalty_home > finalMatch.penalty_away
                    ? finalMatch.home_team?.id || finalMatch.home_team
                    : finalMatch.away_team?.id || finalMatch.away_team;
              }

              if (winnerId) {
                const id = Number(winnerId);
                const labelMap = {
                  senior_boys: 'Senior Boys',
                  girls: 'Girls',
                  junior_boys: 'Junior Boys'
                };
                const label = labelMap[cat] || cat;

                map[id] = map[id] || [];

                if (!map[id].includes(label)) {
                  map[id].push(label);
                }
              }
            } catch (err) {
              // Preserve existing behaviour: ignore category failures.
            }
          })
        );

        if (mounted) setChampionMap(map);
      } catch (err) {
        // Preserve existing behaviour.
      }
    }

    loadChampions();

    return () => {
      mounted = false;
    };
  }, []);

  const fetchTeams = async () => {
    if (!teamsLoadedOnce) setTeamsLoading(true);

    try {
      const t = await api.getTeams();
      setTeams(t || []);
    } catch (e) {
      console.error(e);
    } finally {
      if (!teamsLoadedOnce) setTeamsLoading(false);
      setTeamsLoadedOnce(true);
    }
  };

  const fetchMatches = async () => {
    if (!matchesLoadedOnce) setMatchesLoading(true);

    try {
      const data = await api.getMatches();

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const dayAfter = new Date(tomorrow);
      dayAfter.setDate(dayAfter.getDate() + 1);

      const todayMatches = (data || [])
        .filter((match) => {
          const matchDate = new Date(match.match_date);
          return matchDate >= today && matchDate < tomorrow;
        })
        .slice(0, 3);

      const tomorrowMatches = (data || [])
        .filter((match) => {
          const matchDate = new Date(match.match_date);
          return matchDate >= tomorrow && matchDate < dayAfter;
        })
        .slice(0, 3);

      const displayMatches =
        todayMatches.length > 0 ? todayMatches : tomorrowMatches;

      const showingTomorrowFlag = todayMatches.length === 0;
      const prev = prevMatchesRef.current || {};
      const diffs = {};

      (displayMatches || []).forEach((m) => {
        const old = prev[m.id];
        if (!old) return;

        const changed = {};

        if (m.home_score !== old.home_score) changed.home = true;
        if (m.away_score !== old.away_score) changed.away = true;

        if (Object.keys(changed).length > 0) {
          diffs[m.id] = changed;
        }
      });

      if (Object.keys(diffs).length === 0) {
        setMatches(displayMatches);
        setShowingTomorrow(showingTomorrowFlag);
      } else {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        setFlashMap(diffs);

        timeoutRef.current = setTimeout(() => {
          setMatches(displayMatches);
          setShowingTomorrow(showingTomorrowFlag);
          setFlashMap({});
          timeoutRef.current = null;
        }, FLASH_DURATION);
      }

      prevMatchesRef.current = (data || []).reduce((acc, m) => {
        acc[m.id] = m;
        return acc;
      }, {});
    } catch (e) {
      console.error(e);
    } finally {
      if (!matchesLoadedOnce) setMatchesLoading(false);
      setMatchesLoadedOnce(true);
    }
  };

  usePolling(fetchTeams, {
    minInterval: 5000,
    maxInterval: 10000,
    immediate: true
  });

  usePolling(fetchMatches, {
    minInterval: 5000,
    maxInterval: 10000,
    immediate: true
  });

  useEffect(() => {
    function onMatchUpdated(e) {
      const updated = e && e.detail;
      if (!updated || !updated.id) return;

      prevMatchesRef.current = Object.assign(
        {},
        prevMatchesRef.current || {},
        { [updated.id]: updated }
      );

      setMatches((prev) =>
        (prev || []).map((m) => (m.id === updated.id ? updated : m))
      );
    }

    window.addEventListener('match-updated', onMatchUpdated);
    window.addEventListener('match-scores-saved', onMatchUpdated);

    return () => {
      window.removeEventListener('match-updated', onMatchUpdated);
      window.removeEventListener('match-scores-saved', onMatchUpdated);
    };
  }, []);

  function getLocalMatchTime(dateStr) {
    let d = new Date(dateStr);

    if (isNaN(d)) {
      d = new Date(dateStr.replace(' ', 'T') + '+01:00');
    }

    return isNaN(d) ? dateStr : d.toLocaleString();
  }

  function formatTeamName(name) {
    if (!name) return '';

    return String(name)
      .replace(/\s*(?:\[[^\]]*\]|\([^)]*\))\s*/g, '')
      .trim();
  }

  const championColors = {
    'Senior Boys': '#bd913b',
    Girls: '#b44c79',
    'Junior Boys': '#287d91'
  };

  return (
    <main className="home-page">
      <section className="home-hero">
        <div className="home-hero-inner">
          <div className="home-competition-label">
            UBAKALA FOOTBALL COMPETITION
          </div>

          <h1>UBAKALA UNITY CUP</h1>

          <div className="home-hero-rule" />

          <p className="home-hero-description">
            Celebrating local talent. Bringing our communities together
            through football.
          </p>

          <nav className="home-navigation" aria-label="Main navigation">
            <Link className="home-nav-link home-nav-primary" to="/results">
              Match Results
            </Link>
            <Link className="home-nav-link" to="/standings">
              League Standings
            </Link>
            <Link className="home-nav-link" to="/history">
              Competition History
            </Link>
            <Link className="home-nav-link" to="/news">
              Latest News
            </Link>
            <Link className="home-nav-link home-nav-admin" to="/admin">
              Admin
            </Link>
          </nav>
        </div>
      </section>

      <div className="home-content">
        <section className="home-section home-matches-section">
          <div className="home-section-heading">
            <div>
              <p className="home-eyebrow">FIXTURES &amp; SCORES</p>
              <h2>{showingTomorrow ? "Tomorrow's Matches" : "Today's Matches"}</h2>
            </div>

            <Link className="home-text-link" to="/results">
              All results <span aria-hidden="true">→</span>
            </Link>
          </div>

          {matchesLoading ? (
            <div className="loading">
              Loading matches
              <span className="loading-dots">
                <span />
                <span />
                <span />
              </span>
            </div>
          ) : matches.length > 0 ? (
            <div className="home-match-grid">
              {matches.map((match) => {
                const homeTeam =
                  typeof match.home_team === 'object'
                    ? match.home_team.name
                    : match.home_team;

                const awayTeam =
                  typeof match.away_team === 'object'
                    ? match.away_team.name
                    : match.away_team;

                const homeScore =
                  match.home_score !== null ? match.home_score : '-';

                const awayScore =
                  match.away_score !== null ? match.away_score : '-';

                const stat = getMatchLiveStatus(match);

                return (
                  <article
                    key={match.id}
                    className="home-match-card"
                    onClick={() => navigate(`/results?matchId=${match.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        navigate(`/results?matchId=${match.id}`);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={`${homeTeam} versus ${awayTeam}. View match details.`}
                  >
                    <div className="home-match-topline">
                      <span className="home-match-competition">
                        {match.season?.name || 'League Match'}
                      </span>
                      <span className="home-match-stage">
                        {match.match_stage || 'Match'}
                      </span>
                    </div>

                    {match.void && (
                      <div className="home-match-void">Voided match</div>
                    )}

                    <div className="home-scoreboard">
                      <div className="home-score-team home-score-home">
                        <span className="home-team-side-label">HOME</span>
                        <span className="home-team-name">
                          {homeTeam || 'Home team'}
                        </span>
                      </div>

                      <div className="home-score-centre">
                        <div className="home-score-numbers">
                          <span
                            className={
                              flashMap[match.id]?.home ? 'score-flash' : ''
                            }
                          >
                            {homeScore}
                          </span>
                          <span className="home-score-separator">:</span>
                          <span
                            className={
                              flashMap[match.id]?.away ? 'score-flash' : ''
                            }
                          >
                            {awayScore}
                          </span>
                        </div>

                        {(match.penalty_home !== null ||
                          match.penalty_away !== null) && (
                            <div className="home-penalty-score">
                              Penalties{' '}
                              {match.penalty_home !== null
                                ? match.penalty_home
                                : '-'}{' '}
                              -{' '}
                              {match.penalty_away !== null
                                ? match.penalty_away
                                : '-'}
                            </div>
                          )}
                      </div>

                      <div className="home-score-team home-score-away">
                        <span className="home-team-side-label">AWAY</span>
                        <span className="home-team-name">
                          {awayTeam || 'Away team'}
                        </span>
                      </div>
                    </div>

                    <div className="home-match-status-row">
                      <span
                        className={`home-status-badge home-status-${String(
                          stat.status
                        ).replace(/[^a-zA-Z0-9_-]/g, '')}`}
                      >
                        {stat.label}
                      </span>

                      {match.current_period && (
                        <span className="home-period-badge">
                          {PERIOD_LABELS[match.current_period] ||
                            match.current_period}
                        </span>
                      )}
                    </div>

                    <div className="home-match-details">
                      <div className="home-match-detail">
                        <span className="home-detail-label">DATE &amp; TIME</span>
                        <span>{getLocalMatchTime(match.match_date)}</span>
                      </div>

                      {match.venue && (
                        <div className="home-match-detail">
                          <span className="home-detail-label">VENUE</span>
                          <span>{match.venue}</span>
                        </div>
                      )}
                    </div>

                    {match.is_played && (
                      <div className="home-completed-label">
                        <span aria-hidden="true">✓</span> Match completed
                      </div>
                    )}

                    <div className="home-match-card-footer">
                      View match details <span aria-hidden="true">→</span>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="home-empty-state">
              <div className="home-empty-mark" aria-hidden="true">
                —
              </div>
              <h3>No matches scheduled</h3>
              <p>
                There are no matches available for this date. Please check
                back for upcoming fixtures and results.
              </p>
              <Link className="home-empty-link" to="/results">
                View all results
              </Link>
            </div>
          )}
        </section>

        <section className="home-section home-teams-section">
          <div className="home-section-heading">
            <div>
              <p className="home-eyebrow">THE COMPETITORS</p>
              <h2>Participating Teams</h2>
            </div>
            <span className="home-team-count">
              {teamsLoading
                ? 'Loading teams'
                : `${teams.length} ${teams.length === 1 ? 'team' : 'teams'}`}
            </span>
          </div>

          {teamsLoading ? (
            <div className="loading">
              Loading teams
              <span className="loading-dots">
                <span />
                <span />
                <span />
              </span>
            </div>
          ) : teams.length > 0 ? (
            <div className="home-teams-grid">
              {teams.map((t) => (
                <div key={t.id} className="home-team-card">
                  <div className="home-team-emblem" aria-hidden="true">
                    {formatTeamName(t.name)
                      .split(/\s+/)
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((word) => word.charAt(0))
                      .join('')
                      .toUpperCase()}
                  </div>

                  <div className="home-team-card-name">
                    {formatTeamName(t.name)}
                  </div>

                  {championMap[Number(t.id)]?.length > 0 && (
                    <div className="home-team-champions">
                      {championMap[Number(t.id)].map((label, i) => (
                        <span
                          key={i}
                          className="home-champion-badge"
                          title={`${label} champion`}
                          aria-label={`${label} champion`}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            width="19"
                            height="19"
                            aria-hidden="true"
                            focusable="false"
                          >
                            <path
                              d="M12 2l2.09 6.26L20 9l-4.5 3.26L16.18 20 12 16.8 7.82 20l.68-7.74L4 9l5.91-.74L12 2z"
                              fill={championColors[label] || '#bd913b'}
                            />
                          </svg>
                          <span>{label}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="home-empty-teams">
              No participating teams are available at the moment.
            </div>
          )}
        </section>

        <footer className="home-footer">
          <div className="home-footer-mark">UUC</div>
          <div>
            <strong>UBAKALA UNITY CUP</strong>
            <p>Football. Community. Unity.</p>
          </div>
        </footer>
      </div>
    </main>
  );
}
