import React, { useEffect, useState, useRef } from 'react';
import { api } from '../api/api';
import usePolling from '../utils/usePolling';

const CATEGORIES = [
  { value: 'senior_boys', label: 'Senior Boys' },
  { value: 'girls', label: 'Girls' },
  { value: 'junior_boys', label: 'Junior Boys' },
];

const Standings = () => {
  const [category, setCategory] = useState('senior_boys');
  const [seasons, setSeasons] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState(null);
  // `groups` state removed because we use `standings` structure directly
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [standings, setStandings] = useState([]);
  const [flashMap, setFlashMap] = useState({}); // { [team_id]: { goals_for: bool, goals_against: bool, points: bool } }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // Track which seasons have been loaded at least once to avoid repeatedly
  // showing the initial loading spinner when polling or switching seasons.
  const standingsLoadedOnceRef = useRef({});
  const timeoutRef = useRef(null);
  const appliedMatchIdsRef = useRef(new Set());
  const FLASH_DURATION = 800; // ms
  const lastSeasonRef = useRef(null);

  useEffect(() => {
    // switching category implies a different season context; reset refs and clear displayed standings
    lastSeasonRef.current = null;
    setStandings([]);
    setSelectedGroup(null);
    setLoading(true);
    setError(null);
    api.getSeasons(category)
      .then((data) => {
        setSeasons(data);
        if (data && data.length > 0) {
          setSelectedSeason(Number(data[0].id));
        } else {
          setSelectedSeason(null);
          setStandings([]);
        }
      })
      .catch((err) => setError(err.message || 'Failed to load seasons'))
      .finally(() => setLoading(false));
  }, [category]);

  // Poll grouped standings for the selected season every 5-10s
  const fetchGrouped = async () => {
    if (!selectedSeason) return;
    if (!standingsLoadedOnceRef.current[selectedSeason]) setLoading(true);
    setError(null);
    try {
      // fetch grouped standings plus groups-with-teams and matches to ensure group-stage-only computation
      const [data, groupsWithTeams, matches] = await Promise.all([
        api.getGroupedStandings(selectedSeason, category),
        api.getGroupsWithTeams(selectedSeason),
        api.getMatches({ season: selectedSeason })
      ]);
      // Compute diffs between current `standings` and incoming `data`.
      const newData = data || [];

      // Recompute standings from group-stage matches only using groupsWithTeams and matches
      const recomputed = (groupsWithTeams || []).map((g) => {
        // Safely extract group id/name
        const groupId = g?.group?.id ?? g?.group ?? g?.id ?? g?.group_id ?? null;
        const groupName = g?.group?.name ?? g?.name ?? (typeof g?.group === 'string' ? g.group : null) ?? '';

        // normalize teams array and extract ids/names robustly
        const teamsArr = Array.isArray(g?.teams) ? g.teams : [];
        const teamIds = teamsArr.map((t) => {
          if (!t) return null;
          if (typeof t === 'object') return t.id ?? t.team?.id ?? t.team_id ?? null;
          return t;
        }).filter(Boolean);

        // initialize rows map by team id
        const rows = {};
        teamsArr.forEach((t) => {
          let id = null;
          let name = null;
          if (!t) return;
          if (typeof t === 'object') {
            id = t.id ?? t.team?.id ?? t.team_id ?? null;
            name = t.name ?? t.team?.name ?? (t.team_name ?? null) ?? (id ? String(id) : '');
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

        // count only group-stage matches (matchday < 22) where both teams in this group
        (matches || []).forEach((m) => {
          const md = m.matchday !== undefined && m.matchday !== null ? Number(m.matchday) : null;
          if (md !== null && md >= 22) return; // skip knockout
          const hid = typeof m.home_team === 'object' ? m.home_team.id ?? m.home_team.team?.id ?? null : m.home_team;
          const aid = typeof m.away_team === 'object' ? m.away_team.id ?? m.away_team.team?.id ?? null : m.away_team;
          if (!hid || !aid) return;
          if (!teamIds.includes(hid) || !teamIds.includes(aid)) return;
          // consider only played matches or with scores
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
            homeRow.wins += 1; homeRow.points += 3; awayRow.losses += 1;
          } else if (homeScore < awayScore) {
            awayRow.wins += 1; awayRow.points += 3; homeRow.losses += 1;
          } else {
            homeRow.draws += 1; awayRow.draws += 1; homeRow.points += 1; awayRow.points += 1;
          }
        });

        // finalize goal_diff and convert map to array
        const standingsArr = Object.values(rows).map(r => ({ ...r, goal_diff: r.goals_for - r.goals_against }));
        // sort by points desc, goal_diff desc, goals_for desc
        standingsArr.sort((a, b) => b.points - a.points || b.goal_diff - a.goal_diff || b.goals_for - a.goals_for);

        return { group: { id: groupId, name: groupName }, standings: standingsArr };
      });

      // If recomputed has groups then prefer it over data from API
      const finalData = recomputed && recomputed.length ? recomputed : newData;

      // If the selected season changed since the last applied standings, apply immediately
      if (lastSeasonRef.current !== selectedSeason) {
        setStandings(finalData);
        setFlashMap({});
        // clear any optimistic-applied match ids when we replace standings
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
            if (Object.keys(changed).length > 0) diffs[r.team_id] = changed;
          });
        });

        if (Object.keys(diffs).length === 0) {
          setStandings(finalData);
          appliedMatchIdsRef.current = new Set();
        } else {
          // Show flash on changed cells for FLASH_DURATION, then apply new data
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
      // Ensure loading is cleared after each fetch so the UI doesn't get stuck
      // when switching categories.
      setLoading(false);
      if (selectedSeason) standingsLoadedOnceRef.current[selectedSeason] = true;
    }
  };

  usePolling(fetchGrouped, { minInterval: 5000, maxInterval: 10000, immediate: true });

  // Listen for optimistic match updates from ResultsEditor and apply a local delta
  useEffect(() => {
    function onMatchUpdated(e) {
      const updated = e?.detail;
      if (!updated) return;
      // only apply for the current season and for group-stage matches
      const seasonId = updated?.season?.id ?? updated?.season;
      const md = updated?.matchday ?? null;
      if (!selectedSeason || Number(seasonId) !== Number(selectedSeason)) return;
      if (md !== null && md >= 22) return; // skip knockout
      if (appliedMatchIdsRef.current.has(updated.id)) return;

      // apply optimistic delta to standings
      const hid = updated?.home_team?.id ?? updated?.home_team;
      const aid = updated?.away_team?.id ?? updated?.away_team;
      if (!hid || !aid) return;

      let changed = {};
      const newStandings = (standings || []).map((gblock) => {
        const newRows = (gblock.standings || []).map((r) => {
          if (r.team_id !== hid && r.team_id !== aid) return { ...r };
          // apply played & goals
          const copy = { ...r };
          copy.played = (copy.played || 0) + 1;
          const homeScore = Number(updated.home_score ?? 0);
          const awayScore = Number(updated.away_score ?? 0);
          if (r.team_id === hid) {
            copy.goals_for = (copy.goals_for || 0) + homeScore;
            copy.goals_against = (copy.goals_against || 0) + awayScore;
            if (homeScore > awayScore) { copy.wins = (copy.wins || 0) + 1; copy.points = (copy.points || 0) + 3; }
            else if (homeScore < awayScore) { copy.losses = (copy.losses || 0) + 1; }
            else { copy.draws = (copy.draws || 0) + 1; copy.points = (copy.points || 0) + 1; }
          }
          if (r.team_id === aid) {
            copy.goals_for = (copy.goals_for || 0) + awayScore;
            copy.goals_against = (copy.goals_against || 0) + homeScore;
            if (awayScore > homeScore) { copy.wins = (copy.wins || 0) + 1; copy.points = (copy.points || 0) + 3; }
            else if (awayScore < homeScore) { copy.losses = (copy.losses || 0) + 1; }
            else { copy.draws = (copy.draws || 0) + 1; copy.points = (copy.points || 0) + 1; }
          }
          copy.goal_diff = (copy.goals_for || 0) - (copy.goals_against || 0);
          changed[copy.team_id] = { goals_for: true, goals_against: true, points: true };
          return copy;
        });
        // re-sort group
        newRows.sort((a, b) => (b.points || 0) - (a.points || 0) || (b.goal_diff || 0) - (a.goal_diff || 0) || (b.goals_for || 0) - (a.goals_for || 0));
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

  // When the user changes the selected season, immediately clear the displayed standings
  // and cancel any pending flash timeout so the old standings do not linger while loading.
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

  return (
    <div style={{ padding: '40px 20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h2 style={{ color: '#1e3c72', marginBottom: '30px' }}>🏆 League Standings</h2>

      <div style={{
        display: 'flex',
        gap: '16px',
        alignItems: 'flex-start',
        marginBottom: '30px',
        flexWrap: 'wrap',
        padding: '20px',
        background: '#f8f9ff',
        borderRadius: '10px',
        border: '2px solid #667eea'
      }}>
        <label style={{ fontWeight: '600', color: '#1e3c72', fontSize: 'clamp(13px, 2.5vw, 15px)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          Category:
          <select value={category} onChange={(e) => setCategory(e.target.value)} style={{
            marginLeft: '10px',
            padding: '10px 12px',
            border: '2px solid #667eea',
            borderRadius: '8px',
            fontSize: '14px',
            background: 'white',
            cursor: 'pointer'
          }}>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </label>

        <label style={{ fontWeight: '600', color: '#1e3c72', fontSize: 'clamp(13px, 2.5vw, 15px)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          Season:
          <select value={selectedSeason || ''} onChange={(e) => setSelectedSeason(parseInt(e.target.value))} style={{
            marginLeft: '10px',
            padding: '10px 12px',
            border: '2px solid #667eea',
            borderRadius: '8px',
            fontSize: '14px',
            background: 'white',
            cursor: 'pointer'
          }}>
            {seasons.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </label>
      </div>

      {loading && (
        <div className="loading">⏳ Loading standings<span className="loading-dots"><span></span><span></span><span></span></span></div>
      )}
      {error && (
        <div style={{
          background: '#fee2e2',
          color: '#dc2626',
          padding: '16px',
          borderRadius: '8px',
          border: '1px solid #fca5a5'
        }}>
          ❌ {error}
        </div>
      )}

      {/* Inject CSS for flash animation */}
      <style>{`
        .score-flash { animation: scoreFlash ${FLASH_DURATION}ms ease-in-out; }
        @keyframes scoreFlash {
          0% { background: #fff5b1; }
          50% { background: #fff5b1; }
          100% { background: transparent; }
        }
      `}</style>

      {!loading && standings && standings.length > 0 && (
        <div>
          <div style={{
            display: 'flex',
            gap: 'clamp(8px, 2vw, 10px)',
            marginBottom: '20px',
            flexWrap: 'wrap'
          }}>
            <button
              onClick={() => setSelectedGroup(null)}
              style={{
                padding: 'clamp(8px, 1.5vw, 10px) clamp(12px, 2vw, 16px)',
                background: selectedGroup === null ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#f0f0f0',
                color: selectedGroup === null ? 'white' : '#1e3c72',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                fontSize: 'clamp(12px, 2vw, 14px)'
              }}
              onMouseEnter={(e) => {
                if (selectedGroup === null) {
                  e.target.style.transform = 'translateY(-2px)';
                } else {
                  e.target.style.background = '#e0e0e0';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedGroup === null) {
                  e.target.style.transform = 'translateY(0)';
                } else {
                  e.target.style.background = '#f0f0f0';
                }
              }}
            >
              📊 All Groups
            </button>
            {standings.map((gblock) => (
              <button
                key={gblock.group.id}
                onClick={() => setSelectedGroup(gblock.group.id)}
                style={{
                  padding: '10px 16px',
                  background: selectedGroup === gblock.group.id ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#f0f0f0',
                  color: selectedGroup === gblock.group.id ? 'white' : '#1e3c72',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  fontSize: 'clamp(12px, 2vw, 14px)'
                }}
                onMouseEnter={(e) => {
                  if (selectedGroup === gblock.group.id) {
                    e.target.style.transform = 'translateY(-2px)';
                  } else {
                    e.target.style.background = '#e0e0e0';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedGroup === gblock.group.id) {
                    e.target.style.transform = 'translateY(0)';
                  } else {
                    e.target.style.background = '#f0f0f0';
                  }
                }}
              >
                Group {gblock.group.name}
              </button>
            ))}
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(clamp(280px, 80vw, 380px), 1fr))',
            gap: 'clamp(16px, 3vw, 20px)'
          }}>
            {standings.map((gblock) => {
              const g = gblock.group;
              if (selectedGroup && selectedGroup !== g.id) return null;
              const groupStandings = gblock.standings || [];
              return (
                <div
                  key={g.id}
                  style={{
                    background: 'white',
                    border: '2px solid #667eea',
                    padding: '20px',
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(102, 126, 234, 0.15)';
                    e.currentTarget.style.transform = 'translateY(-4px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <h3 style={{ color: '#1e3c72', marginBottom: '16px', fontSize: 'clamp(16px, 3vw, 18px)', fontWeight: '700' }}>
                    📍 Group {g.name}
                  </h3>
                  {groupStandings.length === 0 ? (
                    <div style={{ color: '#999', textAlign: 'center', padding: '20px' }}>
                      No teams or results for this group yet.
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontSize: 'clamp(11px, 1.8vw, 13px)'
                      }}>
                        <thead>
                          <tr style={{
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white'
                          }}>
                            <th style={{ textAlign: 'center', padding: '10px 4px', fontWeight: '700' }}>#</th>
                            <th style={{ textAlign: 'left', padding: 'clamp(6px, 1.5vw, 10px) clamp(4px, 1vw, 8px)', fontWeight: '700' }}>Team</th>
                            <th style={{ textAlign: 'center', padding: '10px 4px', fontWeight: '700' }}>P</th>
                            <th style={{ textAlign: 'center', padding: '10px 4px', fontWeight: '700' }}>W</th>
                            <th style={{ textAlign: 'center', padding: '10px 4px', fontWeight: '700' }}>D</th>
                            <th style={{ textAlign: 'center', padding: '10px 4px', fontWeight: '700' }}>L</th>
                            <th style={{ textAlign: 'center', padding: '10px 4px', fontWeight: '700' }}>GF</th>
                            <th style={{ textAlign: 'center', padding: '10px 4px', fontWeight: '700' }}>GA</th>
                            <th style={{ textAlign: 'center', padding: '10px 4px', fontWeight: '700' }}>GD</th>
                            <th style={{ textAlign: 'center', padding: '10px 4px', fontWeight: '700', color: '#ffd700' }}>Pts</th>
                          </tr>
                        </thead>
                        <tbody>
                          {groupStandings.map((row, idx) => (
                            <tr
                              key={row.team_id}
                              style={{
                                borderBottom: '1px solid #e0e0e0',
                                background: idx === 0 ? '#fffbeb' : (idx % 2 === 0 ? '#f8f9ff' : 'white'),
                                transition: 'all 0.2s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#f0f4ff';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = idx === 0 ? '#fffbeb' : (idx % 2 === 0 ? '#f8f9ff' : 'white');
                              }}
                            >
                              <td style={{
                                textAlign: 'center',
                                padding: 'clamp(6px, 1.5vw, 10px) clamp(2px, 0.5vw, 4px)',
                                fontWeight: '700',
                                color: '#667eea'
                              }}>
                                {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                              </td>
                              <td style={{ padding: 'clamp(6px, 1.5vw, 10px) clamp(4px, 1vw, 8px)', fontWeight: '600', color: '#1e3c72' }}>
                                {row.team_name}
                              </td>
                              <td style={{ textAlign: 'center', padding: 'clamp(6px, 1.5vw, 10px) clamp(2px, 0.5vw, 4px)', color: '#666' }}>{row.played}</td>
                              <td style={{ textAlign: 'center', padding: 'clamp(6px, 1.5vw, 10px) clamp(2px, 0.5vw, 4px)', color: '#16a34a', fontWeight: '600' }}>{row.wins}</td>
                              <td style={{ textAlign: 'center', padding: 'clamp(6px, 1.5vw, 10px) clamp(2px, 0.5vw, 4px)', color: '#f59e0b', fontWeight: '600' }}>{row.draws}</td>
                              <td style={{ textAlign: 'center', padding: 'clamp(6px, 1.5vw, 10px) clamp(2px, 0.5vw, 4px)', color: '#dc2626', fontWeight: '600' }}>{row.losses}</td>
                              <td
                                className={flashMap[row.team_id]?.goals_for ? 'score-flash' : ''}
                                style={{ textAlign: 'center', padding: 'clamp(6px, 1.5vw, 10px) clamp(2px, 0.5vw, 4px)', color: '#667eea', fontWeight: '600' }}
                              >{row.goals_for}</td>
                              <td
                                className={flashMap[row.team_id]?.goals_against ? 'score-flash' : ''}
                                style={{ textAlign: 'center', padding: 'clamp(6px, 1.5vw, 10px) clamp(2px, 0.5vw, 4px)', color: '#764ba2', fontWeight: '600' }}
                              >{row.goals_against}</td>
                              <td style={{ textAlign: 'center', padding: 'clamp(6px, 1.5vw, 10px) clamp(2px, 0.5vw, 4px)', color: '#666', fontWeight: '600' }}>{row.goal_diff}</td>
                              <td
                                className={flashMap[row.team_id]?.points ? 'score-flash' : ''}
                                style={{
                                  textAlign: 'center',
                                  padding: 'clamp(6px, 1.5vw, 10px) clamp(2px, 0.5vw, 4px)',
                                  fontWeight: '800',
                                  color: '#fcd34d',
                                  fontSize: 'clamp(12px, 1.8vw, 14px)'
                                }}
                              >
                                {row.points}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!loading && standings && standings.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: '#999'
        }}>
          <p style={{ fontSize: '16px' }}>No standings available for this season.</p>
        </div>
      )}
    </div>
  );
};

export default Standings;