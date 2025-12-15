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
  const [standingsLoadedOnce, setStandingsLoadedOnce] = useState(false);
  const timeoutRef = useRef(null);
  const FLASH_DURATION = 800; // ms

  useEffect(() => {
    setLoading(true);
    setError(null);
    api.getSeasons(category)
      .then((data) => {
        setSeasons(data);
        if (data && data.length > 0) {
          setSelectedSeason(data[0].id);
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
    if (!standingsLoadedOnce) setLoading(true);
    setError(null);
    try {
      const data = await api.getGroupedStandings(selectedSeason);
      // Compute diffs between current `standings` and incoming `data`.
      const newData = data || [];
      const diffs = {};

      const oldTeamMap = {};
      (standings || []).forEach((gblock) => {
        (gblock.standings || []).forEach((r) => {
          oldTeamMap[r.team_id] = r;
        });
      });

      (newData || []).forEach((gblock) => {
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
        setStandings(newData);
      } else {
        // Show flash on changed cells for FLASH_DURATION, then apply new data
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setFlashMap(diffs);
        timeoutRef.current = setTimeout(() => {
          setStandings(newData);
          setFlashMap({});
          timeoutRef.current = null;
        }, FLASH_DURATION);
      }
    } catch (err) {
      setError(err?.message || 'Failed to load grouped standings');
    } finally {
      if (!standingsLoadedOnce) setLoading(false);
      setStandingsLoadedOnce(true);
    }
  };

  usePolling(fetchGrouped, { minInterval: 5000, maxInterval: 10000, immediate: true });

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

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
          <select value={selectedSeason || ''} onChange={(e) => setSelectedSeason(e.target.value)} style={{
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