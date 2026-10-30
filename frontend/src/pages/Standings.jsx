import React, { useEffect, useState, useRef } from 'react';
import { api, isAppsScriptReadApiEnabled } from '../api/api';
import usePolling from '../utils/usePolling';
import { isGroupStageMatch, PUBLIC_CATEGORIES } from '../utils/competition';

const PERIOD_LABELS = {
  not_started: 'Not started',
  '1st_half': '1st Half',
  halftime: 'Half Time',
  '2nd_half': '2nd Half',
  ended: 'Ended'
};

const FLASH_DURATION = 800;

const styles = `
  .standings-page {
    --st-primary: #173b70;
    --st-primary-dark: #102b50;
    --st-accent: #d6a83d;
    --st-text: #263449;
    --st-muted: #718096;
    --st-border: #e6ebf2;
    --st-surface: #ffffff;
    --st-background: #f5f7fb;
    min-height: 100vh;
    padding: 38px 22px 64px;
    background: var(--st-background);
    color: var(--st-text);
  }

  .standings-container {
    max-width: 1250px;
    margin: 0 auto;
  }

  /* Page heading */
  .standings-heading {
    position: relative;
    overflow: hidden;
    margin-bottom: 25px;
    padding: 27px 30px 28px;
    border: 1px solid rgba(214, 168, 61, 0.55);
    border-left: 5px solid var(--st-accent);
    border-radius: 16px;
    background: linear-gradient(115deg, #102b50 0%, #173b70 58%, #245286 100%);
    box-shadow: 0 12px 28px rgba(16, 43, 80, 0.14);
  }

  .standings-eyebrow {
    display: inline-flex;
    align-items: center;
    margin-bottom: 11px;
    padding: 6px 10px;
    border: 1px solid rgba(240, 208, 132, 0.35);
    border-radius: 999px;
    background: rgba(214, 168, 61, 0.13);
    color: #f0d084;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 1.6px;
    text-transform: uppercase;
  }

  .standings-title {
    margin: 0;
    color: #ffffff;
    font-size: clamp(28px, 3.5vw, 38px);
    font-weight: 800;
    letter-spacing: -1px;
    line-height: 1.15;
  }

  .standings-subtitle {
    margin: 9px 0 0;
    color: rgba(235, 242, 251, 0.82);
    font-size: 14px;
    line-height: 1.5;
  }

  /* Filters */
  .standings-filter-panel {
    display: flex;
    align-items: flex-end;
    gap: 16px;
    flex-wrap: wrap;
    padding: 20px;
    margin-bottom: 25px;
    background: var(--st-surface);
    border: 1px solid var(--st-border);
    border-radius: 14px;
    box-shadow: 0 3px 14px rgba(20, 43, 75, 0.035);
  }

  .standings-filter {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 190px;
    flex: 1;
  }

  .standings-filter label {
    color: #526176;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: .8px;
    text-transform: uppercase;
  }

  .standings-filter select {
    width: 100%;
    min-height: 44px;
    padding: 0 38px 0 13px;
    border: 1px solid #dce3ed;
    border-radius: 8px;
    background: #fbfcfe;
    color: var(--st-primary-dark);
    font-size: 14px;
    font-weight: 600;
    outline: none;
    cursor: pointer;
    transition: border-color .2s, box-shadow .2s;
  }

  .standings-filter select:focus {
    border-color: #5276a7;
    box-shadow: 0 0 0 3px rgba(82, 118, 167, .12);
  }

  /* Section heading */
  .standings-section-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 14px;
    flex-wrap: wrap;
    margin: 26px 0 16px;
  }

  .standings-section-title {
    margin: 0;
    color: var(--st-primary-dark);
    font-size: 17px;
    font-weight: 800;
  }

  .standings-section-caption {
    margin: 5px 0 0;
    color: var(--st-muted);
    font-size: 12px;
  }

  /* Group navigation */
  .standings-group-nav {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 20px;
  }

  .standings-group-button {
    min-height: 38px;
    padding: 0 15px;
    border: 1px solid #dce3ed;
    border-radius: 8px;
    background: #fff;
    color: #526176;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    transition: all .2s ease;
  }

  .standings-group-button:hover {
    border-color: #8da4c2;
    color: var(--st-primary);
    background: #f7f9fc;
  }

  .standings-group-button.active {
    border-color: var(--st-primary);
    background: var(--st-primary);
    color: #fff;
    box-shadow: 0 3px 8px rgba(23, 59, 112, .16);
  }

  /* Standings cards */
  .standings-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 480px), 1fr));
    gap: 20px;
    align-items: start;
  }

  .standings-card {
    min-width: 0;
    overflow: hidden;
    border: 1px solid var(--st-border);
    border-radius: 13px;
    background: var(--st-surface);
    box-shadow: 0 3px 14px rgba(20, 43, 75, .04);
    transition: box-shadow .2s ease, transform .2s ease;
  }

  .standings-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 22px rgba(20, 43, 75, .08);
  }

  .standings-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 17px 19px;
    border-bottom: 1px solid var(--st-border);
    background: #fff;
  }

  .standings-card-title {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 0;
    color: var(--st-primary-dark);
    font-size: 15px;
    font-weight: 800;
  }

  .standings-card-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 31px;
    height: 31px;
    border-radius: 8px;
    background: #edf2f8;
    color: var(--st-primary);
    font-size: 14px;
  }

  .standings-team-count {
    color: #8793a4;
    font-size: 11px;
    font-weight: 700;
    white-space: nowrap;
  }

  /* Standings table */
  .standings-table-wrap {
    width: 100%;
    overflow-x: auto;
    scrollbar-width: thin;
  }

  .standings-table {
    width: 100%;
    min-width: 490px;
    border-collapse: collapse;
    font-size: 12px;
  }

  .standings-table thead {
    background: #f4f6fa;
  }

  .standings-table th {
    padding: 12px 7px;
    color: #64748b;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: .35px;
    text-align: center;
    white-space: nowrap;
  }

  .standings-table th:nth-child(2) {
    text-align: left;
    padding-left: 12px;
  }

  .standings-table td {
    padding: 13px 7px;
    border-bottom: 1px solid #edf0f4;
    color: #526176;
    text-align: center;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .standings-table tbody tr:last-child td {
    border-bottom: none;
  }

  .standings-table tbody tr {
    transition: background .18s ease;
  }

  .standings-table tbody tr:hover {
    background: #f3f7fc !important;
  }

  .standings-table td.team-name {
    max-width: 180px;
    overflow: hidden;
    padding-left: 12px;
    color: #263b57;
    font-weight: 700;
    text-align: left;
    text-overflow: ellipsis;
  }

  .standings-table td.position {
    color: #75849a;
    font-weight: 800;
  }

  .standings-table td.position.first {
    color: #b58727;
  }

  .standings-table td.wins {
    color: #16804b;
    font-weight: 700;
  }

  .standings-table td.draws {
    color: #bd861b;
    font-weight: 700;
  }

  .standings-table td.losses {
    color: #c34c4c;
    font-weight: 700;
  }

  .standings-table td.goal-for {
    color: #315d91;
    font-weight: 700;
  }

  .standings-table td.goal-against {
    color: #7a6296;
    font-weight: 700;
  }

  .standings-table td.points {
    color: var(--st-primary-dark);
    font-size: 13px;
    font-weight: 900;
  }

  /* Empty and loading states */
  .standings-empty-group {
    padding: 30px 16px;
    color: #8793a4;
    font-size: 13px;
    text-align: center;
  }

  .standings-state {
    padding: 54px 20px;
    border: 1px solid var(--st-border);
    border-radius: 13px;
    background: #fff;
    text-align: center;
  }

  .standings-state-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 54px;
    height: 54px;
    margin-bottom: 15px;
    border-radius: 16px;
    background: #edf2f8;
    color: var(--st-primary);
    font-size: 23px;
  }

  .standings-state h3 {
    margin: 0 0 7px;
    color: var(--st-primary-dark);
    font-size: 16px;
    font-weight: 800;
  }

  .standings-state p {
    max-width: 440px;
    margin: 0 auto;
    color: var(--st-muted);
    font-size: 13px;
    line-height: 1.6;
  }

  .standings-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 11px;
    padding: 35px 15px;
    color: #536780;
    font-size: 13px;
    font-weight: 600;
  }

  .standings-spinner {
    width: 19px;
    height: 19px;
    border: 2px solid #dbe3ed;
    border-top-color: var(--st-primary);
    border-radius: 50%;
    animation: standingsSpin .7s linear infinite;
  }

  @keyframes standingsSpin {
    to { transform: rotate(360deg); }
  }

  /* Notifications */
  .standings-alert {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 13px 15px;
    margin: 15px 0;
    border: 1px solid #f0d5a1;
    border-radius: 9px;
    background: #fff9ec;
    color: #805b17;
    font-size: 12px;
    line-height: 1.5;
  }

  .standings-error {
    border-color: #f0c4c4;
    background: #fff4f4;
    color: #b42323;
  }

  /* Score update animation */
  .score-flash {
    animation: scoreFlash ${FLASH_DURATION}ms ease-in-out;
  }

  @keyframes scoreFlash {
    0%, 50% { background: #fff1bf; }
    100% { background: transparent; }
  }

  /* Mobile responsiveness */
  @media (max-width: 650px) {
    .standings-page {
      padding: 27px 13px 45px;
    }

    .standings-heading {
      margin-bottom: 22px;
      padding: 22px 19px 23px;
    }

    .standings-title {
      font-size: 29px;
    }

    .standings-filter-panel {
      gap: 13px;
      padding: 15px;
    }

    .standings-filter {
      min-width: 100%;
    }

    .standings-section-top {
      margin-top: 22px;
    }

    .standings-grid {
      grid-template-columns: minmax(0, 1fr);
      gap: 15px;
    }

    .standings-card-header {
      padding: 14px;
    }

    .standings-table {
      min-width: 470px;
    }

    .standings-table th,
    .standings-table td {
      padding-top: 12px;
      padding-bottom: 12px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .standings-page *,
    .standings-page *::before,
    .standings-page *::after {
      animation-duration: .01ms !important;
      transition-duration: .01ms !important;
    }
  }
`;

const Standings = () => {
  const [category, setCategory] = useState('senior_boys');
  const [seasons, setSeasons] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [standings, setStandings] = useState([]);
  const [flashMap, setFlashMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const standingsLoadedOnceRef = useRef({});
  const timeoutRef = useRef(null);
  const appliedMatchIdsRef = useRef(new Set());
  const lastSeasonRef = useRef(null);

  const [periodNotification, setPeriodNotification] = useState(null);

  useEffect(() => {
    lastSeasonRef.current = null;
    setStandings([]);
    setSelectedGroup(null);
    setLoading(true);
    setError(null);

    let cancelled = false;

    api.getSeasons(category)
      .then((data) => {
        if (cancelled) return;

        setSeasons(data);

        if (data && data.length > 0) {
          setSelectedSeason(String(data[0].id));
        } else {
          setSelectedSeason(null);
          setStandings([]);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load seasons');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [category]);

  // Existing grouped standings and group-stage calculation logic.
  const fetchGrouped = async () => {
    if (!selectedSeason) return;

    if (!standingsLoadedOnceRef.current[selectedSeason]) {
      setLoading(true);
    }

    setError(null);

    try {
      let data;
      let groupsWithTeams;
      let matches;

      if (isAppsScriptReadApiEnabled()) {
        [groupsWithTeams, matches] = await Promise.all([
          api.getGroupsWithTeams(selectedSeason),
          api.getMatches({ season: selectedSeason })
        ]);
        data = [];
      } else {
        [data, groupsWithTeams, matches] = await Promise.all([
          api.getGroupedStandings(selectedSeason, category),
          api.getGroupsWithTeams(selectedSeason),
          api.getMatches({ season: selectedSeason })
        ]);
      }

      const newData = data || [];

      const recomputed = (groupsWithTeams || []).map((g) => {
        const groupId = g?.group?.id ?? g?.group ?? g?.id ?? g?.group_id ?? null;
        const groupName =
          g?.group?.name ??
          g?.name ??
          (typeof g?.group === 'string' ? g.group : null) ??
          '';

        const teamsArr = Array.isArray(g?.teams) ? g.teams : [];

        const teamIds = teamsArr.map((t) => {
          if (!t) return null;
          if (typeof t === 'object') {
            return t.id ?? t.team?.id ?? t.team_id ?? null;
          }
          return t;
        }).filter(Boolean);

        const rows = {};

        teamsArr.forEach((t) => {
          let id = null;
          let name = null;

          if (!t) return;

          if (typeof t === 'object') {
            id = t.id ?? t.team?.id ?? t.team_id ?? null;
            name =
              t.name ??
              t.team?.name ??
              (t.team_name ?? null) ??
              (id ? String(id) : '');
          } else {
            id = t;
            name = String(t);
          }

          if (!id) return;

          rows[id] = {
            team_id: id,
            team_name: name,
            played: 0,
            wins: 0,
            draws: 0,
            losses: 0,
            goals_for: 0,
            goals_against: 0,
            goal_diff: 0,
            points: 0
          };
        });

        (matches || []).forEach((m) => {
          if (!isGroupStageMatch(m)) return;

          const hid =
            typeof m.home_team === 'object'
              ? m.home_team.id ?? m.home_team.team?.id ?? null
              : m.home_team;

          const aid =
            typeof m.away_team === 'object'
              ? m.away_team.id ?? m.away_team.team?.id ?? null
              : m.away_team;

          if (!hid || !aid) return;
          if (!teamIds.includes(hid) || !teamIds.includes(aid)) return;

          const homeScore = m.home_score;
          const awayScore = m.away_score;

          if (homeScore === null || awayScore === null) return;

          const homeRow = rows[hid];
          const awayRow = rows[aid];

          if (!homeRow || !awayRow) return;

          homeRow.played += 1;
          awayRow.played += 1;

          homeRow.goals_for += Number(homeScore);
          homeRow.goals_against += Number(awayScore);

          awayRow.goals_for += Number(awayScore);
          awayRow.goals_against += Number(homeScore);

          if (homeScore > awayScore) {
            homeRow.wins += 1;
            homeRow.points += 3;
            awayRow.losses += 1;
          } else if (homeScore < awayScore) {
            awayRow.wins += 1;
            awayRow.points += 3;
            homeRow.losses += 1;
          } else {
            homeRow.draws += 1;
            awayRow.draws += 1;
            homeRow.points += 1;
            awayRow.points += 1;
          }
        });

        const standingsArr = Object.values(rows).map((r) => ({
          ...r,
          goal_diff: r.goals_for - r.goals_against
        }));

        standingsArr.sort(
          (a, b) =>
            b.points - a.points ||
            b.goal_diff - a.goal_diff ||
            b.goals_for - a.goals_for
        );

        return {
          group: { id: groupId, name: groupName },
          standings: standingsArr
        };
      });

      const finalData =
        recomputed && recomputed.length ? recomputed : newData;

      if (lastSeasonRef.current !== selectedSeason) {
        setStandings(finalData);
        setFlashMap({});
        appliedMatchIdsRef.current = new Set();
        lastSeasonRef.current = selectedSeason;
      } else {
        const diffs = {};
        const oldTeamMap = {};

        (standings || []).forEach((gblock) => {
          (gblock.standings || []).forEach((r) => {
            oldTeamMap[r.team_id] = r;
          });
        });

        (finalData || []).forEach((gblock) => {
          (gblock.standings || []).forEach((r) => {
            const old = oldTeamMap[r.team_id];
            if (!old) return;

            const changed = {};

            if (r.goals_for !== old.goals_for) changed.goals_for = true;
            if (r.goals_against !== old.goals_against) changed.goals_against = true;
            if (r.points !== old.points) changed.points = true;

            if (Object.keys(changed).length > 0) {
              diffs[r.team_id] = changed;
            }
          });
        });

        if (Object.keys(diffs).length === 0) {
          setStandings(finalData);
          appliedMatchIdsRef.current = new Set();
        } else {
          if (timeoutRef.current) clearTimeout(timeoutRef.current);

          setFlashMap(diffs);

          timeoutRef.current = setTimeout(() => {
            setStandings(finalData);
            setFlashMap({});
            appliedMatchIdsRef.current = new Set();
            timeoutRef.current = null;
            lastSeasonRef.current = selectedSeason;
          }, FLASH_DURATION);
        }
      }
    } catch (err) {
      setError(err?.message || 'Failed to load grouped standings');
    } finally {
      setLoading(false);

      if (selectedSeason) {
        standingsLoadedOnceRef.current[selectedSeason] = true;
      }
    }
  };

  usePolling(fetchGrouped, {
    minInterval: 5000,
    maxInterval: 10000,
    immediate: true
  });

  // Existing optimistic match-update handling.
  useEffect(() => {
    function onMatchUpdated(e) {
      const updated = e?.detail;
      if (!updated) return;

      const seasonId = updated?.season?.id ?? updated?.season;
      const md = updated?.matchday ?? null;

      if (!selectedSeason || String(seasonId) !== String(selectedSeason)) return;
      if (md !== null && md >= 22) return;
      if (appliedMatchIdsRef.current.has(updated.id)) return;

      const hid = updated?.home_team?.id ?? updated?.home_team;
      const aid = updated?.away_team?.id ?? updated?.away_team;

      if (!hid || !aid) return;

      const changed = {};

      const newStandings = (standings || []).map((gblock) => {
        const newRows = (gblock.standings || []).map((r) => {
          if (r.team_id !== hid && r.team_id !== aid) {
            return { ...r };
          }

          const copy = { ...r };
          copy.played = (copy.played || 0) + 1;

          const homeScore = Number(updated.home_score ?? 0);
          const awayScore = Number(updated.away_score ?? 0);

          if (r.team_id === hid) {
            copy.goals_for = (copy.goals_for || 0) + homeScore;
            copy.goals_against = (copy.goals_against || 0) + awayScore;

            if (homeScore > awayScore) {
              copy.wins = (copy.wins || 0) + 1;
              copy.points = (copy.points || 0) + 3;
            } else if (homeScore < awayScore) {
              copy.losses = (copy.losses || 0) + 1;
            } else {
              copy.draws = (copy.draws || 0) + 1;
              copy.points = (copy.points || 0) + 1;
            }
          }

          if (r.team_id === aid) {
            copy.goals_for = (copy.goals_for || 0) + awayScore;
            copy.goals_against = (copy.goals_against || 0) + homeScore;

            if (awayScore > homeScore) {
              copy.wins = (copy.wins || 0) + 1;
              copy.points = (copy.points || 0) + 3;
            } else if (awayScore < homeScore) {
              copy.losses = (copy.losses || 0) + 1;
            } else {
              copy.draws = (copy.draws || 0) + 1;
              copy.points = (copy.points || 0) + 1;
            }
          }

          copy.goal_diff =
            (copy.goals_for || 0) - (copy.goals_against || 0);

          changed[copy.team_id] = {
            goals_for: true,
            goals_against: true,
            points: true
          };

          return copy;
        });

        newRows.sort(
          (a, b) =>
            (b.points || 0) - (a.points || 0) ||
            (b.goal_diff || 0) - (a.goal_diff || 0) ||
            (b.goals_for || 0) - (a.goals_for || 0)
        );

        return { ...gblock, standings: newRows };
      });

      if (Object.keys(changed).length > 0) {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        setFlashMap(changed);
        setStandings(newStandings);

        timeoutRef.current = setTimeout(() => {
          setFlashMap({});
          timeoutRef.current = null;
        }, FLASH_DURATION);
      }

      appliedMatchIdsRef.current.add(updated.id);

      try {
        const per = updated?.current_period;

        if (per) {
          const home = updated?.home_team?.name || updated?.home_team || '';
          const away = updated?.away_team?.name || updated?.away_team || '';
          const label = PERIOD_LABELS[per] || per;

          setPeriodNotification(`${home} vs ${away}: ${label}`);
          setTimeout(() => setPeriodNotification(null), 4000);
        }
      } catch (err) {
        // Ignore notification errors.
      }
    }

    window.addEventListener('match-updated', onMatchUpdated);
    window.addEventListener('match-scores-saved', onMatchUpdated);

    return () => {
      window.removeEventListener('match-updated', onMatchUpdated);
      window.removeEventListener('match-scores-saved', onMatchUpdated);
    };
  }, [selectedSeason, standings]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (selectedSeason === null) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    lastSeasonRef.current = null;
    setFlashMap({});
    setStandings([]);
    setLoading(true);
  }, [selectedSeason]);

  const visibleGroups = standings.filter((gblock) => (
    selectedGroup === null || String(selectedGroup) === String(gblock.group.id)
  ));

  return (
    <div className="standings-page">
      <style>{styles}</style>

      <div className="standings-container">
        <header className="standings-heading">
          <div className="standings-eyebrow">
            Competition Overview
          </div>

          <h1 className="standings-title">
            League Table
          </h1>

          <p className="standings-subtitle">
            Current group standings and team performance.
          </p>
        </header>

        <section className="standings-filter-panel" aria-label="Standings filters">
          <div className="standings-filter">
            <label htmlFor="standings-category">Competition category</label>
            <select
              id="standings-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {PUBLIC_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="standings-filter">
            <label htmlFor="standings-season">Season</label>
            <select
              id="standings-season"
              value={selectedSeason || ''}
              onChange={(e) => setSelectedSeason(e.target.value || null)}
              disabled={!seasons.length}
            >
              {seasons.length === 0 && (
                <option value="">No season available</option>
              )}

              {seasons.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </section>

        {periodNotification && (
          <div className="standings-alert" role="status">
            <span aria-hidden="true">●</span>
            <span>{periodNotification}</span>
          </div>
        )}

        {error && (
          <div className="standings-alert standings-error" role="alert">
            <span aria-hidden="true">!</span>
            <span>{error}</span>
          </div>
        )}

        {loading && (
          <div className="standings-loading" role="status">
            <span className="standings-spinner" />
            <span>Loading standings...</span>
          </div>
        )}

        {!loading && standings.length > 0 && (
          <>
            <div className="standings-section-top">
              <div>
                <h2 className="standings-section-title">
                  Group Tables
                </h2>

                <p className="standings-section-caption">
                  Team positions and performance in the group stage.
                </p>
              </div>
            </div>

            <nav className="standings-group-nav" aria-label="Filter by group">
              <button
                type="button"
                className={`standings-group-button ${selectedGroup === null ? 'active' : ''}`}
                onClick={() => setSelectedGroup(null)}
                aria-pressed={selectedGroup === null}
              >
                All Groups
              </button>

              {standings.map((gblock) => (
                <button
                  type="button"
                  key={gblock.group.id}
                  className={`standings-group-button ${String(selectedGroup) === String(gblock.group.id) ? 'active' : ''}`}
                  onClick={() => setSelectedGroup(gblock.group.id)}
                  aria-pressed={String(selectedGroup) === String(gblock.group.id)}
                >
                  Group {gblock.group.name}
                </button>
              ))}
            </nav>

            <div className="standings-grid">
              {visibleGroups.map((gblock) => {
                const group = gblock.group;
                const groupStandings = gblock.standings || [];

                return (
                  <section
                    className="standings-card"
                    key={group.id}
                    aria-label={`Group ${group.name} standings`}
                  >
                    <div className="standings-card-header">
                      <h3 className="standings-card-title">
                        <span className="standings-card-icon">▤</span>
                        Group {group.name}
                      </h3>

                      <span className="standings-team-count">
                        {groupStandings.length} {groupStandings.length === 1 ? 'TEAM' : 'TEAMS'}
                      </span>
                    </div>

                    {groupStandings.length === 0 ? (
                      <div className="standings-empty-group">
                        No teams or results for this group yet.
                      </div>
                    ) : (
                      <div className="standings-table-wrap">
                        <table className="standings-table">
                          <thead>
                            <tr>
                              <th title="Position">#</th>
                              <th>Team</th>
                              <th title="Played">P</th>
                              <th title="Won">W</th>
                              <th title="Drawn">D</th>
                              <th title="Lost">L</th>
                              <th title="Goals For">GF</th>
                              <th title="Goals Against">GA</th>
                              <th title="Goal Difference">GD</th>
                              <th title="Points">PTS</th>
                            </tr>
                          </thead>

                          <tbody>
                            {groupStandings.map((row, idx) => (
                              <tr
                                key={row.team_id}
                                style={{
                                  background: idx === 0
                                    ? '#fffbef'
                                    : idx % 2 === 0
                                      ? '#ffffff'
                                      : '#fafbfd'
                                }}
                              >
                                <td className={`position ${idx === 0 ? 'first' : ''}`}>
                                  {idx + 1}
                                </td>

                                <td className="team-name" title={row.team_name}>
                                  {row.team_name}
                                </td>

                                <td>{row.played}</td>
                                <td className="wins">{row.wins}</td>
                                <td className="draws">{row.draws}</td>
                                <td className="losses">{row.losses}</td>

                                <td className={`goal-for ${flashMap[row.team_id]?.goals_for ? 'score-flash' : ''}`}>
                                  {row.goals_for}
                                </td>

                                <td className={`goal-against ${flashMap[row.team_id]?.goals_against ? 'score-flash' : ''}`}>
                                  {row.goals_against}
                                </td>

                                <td>{row.goal_diff}</td>

                                <td className={`points ${flashMap[row.team_id]?.points ? 'score-flash' : ''}`}>
                                  {row.points}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          </>
        )}

        {!loading && standings.length === 0 && !error && (
          <div className="standings-state">
            <div className="standings-state-icon" aria-hidden="true">
              ▤
            </div>

            <h3>No standings available</h3>

            <p>
              There are currently no standings to display for this season.
              Please check another season or category.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Standings;