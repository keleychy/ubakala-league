import { useEffect, useState, useRef } from 'react';
import { api } from '../api/api';
import usePolling from '../utils/usePolling';
import './Results.css';

const Results = () => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filteredMatches, setFilteredMatches] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState(null);
  const [flashMap, setFlashMap] = useState({});
  const timeoutRef = useRef(null);
  const FLASH_DURATION = 800;
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);


  useEffect(() => {
    // Fetch seasons
    api.getSeasons().then(data => {
      setSeasons(data);
      if (data.length > 0) {
        setSelectedSeason(data[0].id);
      }
    }).catch(console.error);
  }, []);

  // usePolling will call this repeatedly (with optional jitter)
  const fetchScores = async () => {
    try {
      const data = await api.getMatches();
      const prev = prevMatchesRef.current || {};
      // detect score diffs
      const scoreDiffs = {};
      (data || []).forEach((m) => {
        const old = prev[m.id];
        if (!old) return;
        const changed = {};
        if (m.home_score !== old.home_score) changed.home = true;
        if (m.away_score !== old.away_score) changed.away = true;
        if (Object.keys(changed).length > 0) scoreDiffs[m.id] = changed;
      });
      if (data && Array.isArray(data)) {
        data.forEach((m) => {
          try {
            const prevMatch = prev[m.id];
            const prevHome = prevMatch ? (typeof prevMatch.home_team === 'object' ? prevMatch.home_team.name : prevMatch.home_team) : null;
            const prevAway = prevMatch ? (typeof prevMatch.away_team === 'object' ? prevMatch.away_team.name : prevMatch.away_team) : null;
            const nowHome = typeof m.home_team === 'object' ? m.home_team.name : m.home_team;
            const nowAway = typeof m.away_team === 'object' ? m.away_team.name : m.away_team;
            const wasPending = /WINNER|LOSER/i.test(prevHome) || /WINNER|LOSER/i.test(prevAway);
            const nowResolved = !(/WINNER|LOSER/i.test(nowHome) || /WINNER|LOSER/i.test(nowAway));
            if (wasPending && nowResolved) {
              setHighlighted((h) => ({ ...h, [m.id]: true }));
              setTimeout(() => {
                setHighlighted((h) => {
                  const next = { ...h };
                  delete next[m.id];
                  return next;
                });
              }, 2500);
            }
          } catch (e) {
            // ignore comparison errors for safety
          }
        });
      }
      if (Object.keys(scoreDiffs).length === 0) {
        setMatches(data || []);
        setLoading(false);
        prevMatchesRef.current = (data || []).reduce((acc, m) => { acc[m.id] = m; return acc; }, {});
      } else {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setFlashMap(scoreDiffs);
        timeoutRef.current = setTimeout(() => {
          setMatches(data || []);
          setFlashMap({});
          setLoading(false);
          prevMatchesRef.current = (data || []).reduce((acc, m) => { acc[m.id] = m; return acc; }, {});
          timeoutRef.current = null;
        }, FLASH_DURATION);
      }
    } catch (error) {
      console.error('Error fetching matches:', error);
      setMatches([]);
      setLoading(false);
    }
  };

  // poll matches every 5-10s (randomized to avoid stampeding)
  usePolling(fetchScores, { minInterval: 5000, maxInterval: 10000, immediate: true });

  // Filter matches by selected season
  useEffect(() => {
    if (selectedSeason && matches.length > 0) {
      const filtered = matches.filter(m => {
        const seasonId = typeof m.season === 'object' ? m.season.id : m.season;
        return seasonId === selectedSeason;
      });
      // Sort by match_date descending (most recent first)
      filtered.sort((a, b) => new Date(b.match_date) - new Date(a.match_date));
      setFilteredMatches(filtered);
    } else {
      setFilteredMatches([]);
    }
  }, [selectedSeason, matches]);

  const formatDate = (dateStr) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleString();
    } catch {
      return dateStr;
    }
  };

  // removed unused getSeasonName to satisfy eslint

  // Map matchday -> stage name
  const matchdayToStage = (md) => {
    if (!md && md !== 0) return 'Group Stage';
    if (md >= 22 && md <= 25) return 'Quarterfinals';
    if (md >= 26 && md <= 27) return 'Semifinals';
    if (md === 28) return 'Third Place';
    if (md === 29) return 'Final';
    return 'Group Stage';
  };

  const isPlaceholder = (teamName) => {
    if (!teamName) return false;
    return /WINNER|LOSER/i.test(teamName);
  };

  const formatPlaceholder = (teamName, match) => {
    if (!teamName) return null;
    // Extract a numeric reference if present (e.g., MD22 or 22)
    const digits = (teamName.match(/(\d{1,3})/) || [null])[0];
    const num = digits ? parseInt(digits, 10) : null;
    let descriptor = 'TBD';
    if (/WINNER/i.test(teamName)) descriptor = 'Winner';
    else if (/LOSER/i.test(teamName)) descriptor = 'Loser';
    else if (/RUNNER|FINALIST/i.test(teamName)) descriptor = 'Finalist';

    // Map known matchday numbers to friendly slot labels
    const qfMap = { 22: 'A', 23: 'B', 24: 'C', 25: 'D' };
    const sfMap = { 26: 'A', 27: 'B' };

    let slotLabel = '';
    let stageLabel = null;
    if (num && qfMap[num]) {
      stageLabel = 'Quarterfinal';
      slotLabel = ` ${qfMap[num]}`;
    } else if (num && sfMap[num]) {
      stageLabel = 'Semifinal';
      slotLabel = ` ${sfMap[num]}`;
    } else if (num === 28) {
      stageLabel = 'Third Place';
    } else if (num === 29) {
      stageLabel = 'Final';
    } else if (match && match.matchday) {
      // fallback: use match's matchday to provide context
      const md = Number(match.matchday);
      stageLabel = matchdayToStage(md);
    }

    const label = slotLabel ? `${stageLabel}${slotLabel}` : (stageLabel || 'Knockout');

    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <span className="placeholder-pill">{descriptor} — {label}</span>
      </span>
    );
  };

  const renderTeam = (teamValue, match) => {
    const name = typeof teamValue === 'object' ? teamValue.name : teamValue;
    if (!name) return <span style={{ color: '#94a3b8' }}>— TBD —</span>;
    if (isPlaceholder(name)) return formatPlaceholder(name, match);
    return <span style={{ fontWeight: 700, color: '#1e3c72' }}>{name}</span>;
  };

  const prevMatchesRef = useRef({});
  const [highlighted, setHighlighted] = useState({});

  const groupMatchesByStage = (matchesArr) => {
    const groups = {};
    matchesArr.forEach((m) => {
      const stage = matchdayToStage(m.matchday);
      if (!groups[stage]) groups[stage] = [];
      groups[stage].push(m);
    });
    // Order stages in a natural bracket order if present
    const order = ['Final', 'Third Place', 'Semifinals', 'Quarterfinals', 'Group Stage'];
    const ordered = {};
    order.forEach((s) => { if (groups[s]) ordered[s] = groups[s].sort((a, b) => a.matchday - b.matchday); });
    // append any other stages
    Object.keys(groups).forEach((s) => { if (!ordered[s]) ordered[s] = groups[s].sort((a, b) => a.matchday - b.matchday); });
    return ordered;
  };

  return (
    <div style={{ padding: '40px 20px', maxWidth: '1000px', margin: '0 auto' }}>
      <style>{`
        .score-flash { animation: scoreFlash ${FLASH_DURATION}ms ease-in-out; }
        @keyframes scoreFlash { 0% { background: #fff5b1; } 50% { background: #fff5b1; } 100% { background: transparent; } }
      `}</style>
      <div style={{ padding: 'clamp(20px, 5vw, 40px) clamp(15px, 3vw, 20px)', maxWidth: '1000px', margin: '0 auto' }}>
        <h2 style={{ color: '#1e3c72', marginBottom: '30px' }}>📊 Live Scores & Results</h2>

        {/* Season selector */}
        <div style={{
          marginBottom: '30px',
          padding: '20px',
          background: '#f8f9ff',
          borderRadius: '10px',
          border: '2px solid #667eea'
        }}>
          <label style={{ fontWeight: '600', color: '#1e3c72', fontSize: 'clamp(13px, 2.5vw, 16px)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            Select Season:
            <select
              value={selectedSeason || ''}
              onChange={(e) => setSelectedSeason(parseInt(e.target.value))}
              style={{
                marginLeft: '0',
                padding: '10px 14px',
                border: '2px solid #667eea',
                borderRadius: '8px',
                fontSize: 'clamp(12px, 2.5vw, 14px)',
                fontWeight: '500',
                background: 'white',
                cursor: 'pointer',
                minWidth: 'clamp(150px, 60vw, 250px)'
              }}
            >
              <option value="">-- Select a season --</option>
              {seasons.map(season => (
                <option key={season.id} value={season.id}>
                  {season.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Matches list (grouped by stage) */}
        {loading ? (
          <div className="loading">⏳ Loading matches<span className="loading-dots"><span></span><span></span><span></span></span></div>
        ) : filteredMatches.length > 0 ? (
          (() => {
            const grouped = groupMatchesByStage(filteredMatches);
            const total = filteredMatches.length;
            return (
              <div>
                {/* Compact header: show only total matches to declutter badges */}
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap' }}>
                  <div style={{ marginLeft: 'auto', padding: 'clamp(6px, 1vw, 8px) clamp(10px, 2vw, 12px)', borderRadius: '999px', border: '1px solid rgba(30,41,59,0.06)', background: 'rgba(238,242,255,0.6)', color: '#0f172a', fontWeight: 700, fontSize: 'clamp(11px, 2vw, 13px)' }}>📌 {total} match{total !== 1 ? 'es' : ''}</div>
                </div>

                {/* Compact bracket visual (Semifinals -> Final) */}
                {(() => {
                  // Use filteredMatches (current season) and coerce matchday to number
                  const sf1 = filteredMatches.find(m => Number(m.matchday) === 26) || null;
                  const sf2 = filteredMatches.find(m => Number(m.matchday) === 27) || null;
                  const third = filteredMatches.find(m => Number(m.matchday) === 28) || null;
                  const finalMatch = filteredMatches.find(m => Number(m.matchday) === 29) || null;
                  if (!sf1 && !sf2 && !finalMatch) return null;
                  const sf1Played = sf1 && sf1.is_played;
                  const sf2Played = sf2 && sf2.is_played;
                  const finalPlayed = finalMatch && finalMatch.is_played;
                  const animateConnector = finalPlayed || (sf1Played && sf2Played);
                  const compactBox = (title, match) => (
                    <div style={{ minWidth: 'clamp(180px, 40vw, 220px)', padding: 'clamp(8px, 2vw, 10px)', borderRadius: '8px', background: '#ffffff', boxShadow: '0 1px 6px rgba(2,6,23,0.04)', border: '1px solid #e6eefb' }}>
                      <div style={{ fontSize: 'clamp(11px, 2vw, 13px)', color: '#0f172a', fontWeight: 800, marginBottom: 6 }}>{title}</div>
                      {match ? (
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 'clamp(12px, 2vw, 14px)' }}>{renderTeam(match.home_team, match)} <span className={flashMap[match.id]?.home ? 'score-flash' : ''} style={{ color: '#2b6cb0', margin: '0 6px' }}>{match.home_score ?? '-'}</span></div>
                          <div style={{ fontWeight: 700, marginTop: 6, fontSize: 'clamp(12px, 2vw, 14px)' }}>{renderTeam(match.away_team, match)} <span className={flashMap[match.id]?.away ? 'score-flash' : ''} style={{ color: '#2b6cb0', margin: '0 6px' }}>{match.away_score ?? '-'}</span></div>
                          <div style={{ marginTop: 8, fontSize: 'clamp(10px, 1.5vw, 12px)', color: '#6b7280' }}>MD {match.matchday} • {formatDate(match.match_date)}</div>
                        </div>
                      ) : (
                        <div style={{ color: '#94a3b8', fontSize: 'clamp(11px, 2vw, 12px)' }}>— not scheduled —</div>
                      )}
                    </div>
                  );

                  return (
                    <div className={"compact-bracket" + (animateConnector ? ' center' : '')} style={{ marginBottom: '18px', flexWrap: 'wrap' }}>
                      <div className="compact-left">
                        {compactBox('Semifinal 1', sf1)}
                        {compactBox('Semifinal 2', sf2)}
                      </div>
                      <div className="connector-col">
                        {/* animated connector line */}
                        <div className={"connector-line" + (animateConnector ? ' draw' : '')} />
                      </div>
                      <div className="compact-right">
                        {compactBox('Third Place', third)}
                        {compactBox('Final', finalMatch)}
                      </div>
                    </div>
                  );
                })()}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  {Object.entries(grouped).map(([stage, matches]) => (
                    <div key={stage}>
                      <h3 style={{ margin: '6px 0 12px', color: '#0f172a', fontSize: 'clamp(14px, 2.5vw, 16px)' }}>{stage}</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {matches.map((match) => {
                          const homeScore = match.home_score !== null ? match.home_score : '-';
                          const awayScore = match.away_score !== null ? match.away_score : '-';
                          const isPlayed = match.is_played;
                          const isVoid = !!match.void;

                          return (
                            <div
                              key={match.id}
                              className={highlighted[match.id] ? 'match-highlight' : ''}
                              style={{
                                border: isVoid ? '2px dashed #dc2626' : '2px solid #e6edf8',
                                padding: 'clamp(10px, 3vw, 14px)',
                                borderRadius: '10px',
                                backgroundColor: isVoid ? '#fff1f2' : (isPlayed ? '#f8fafc' : '#ffffff'),
                                boxShadow: '0 1px 6px rgba(2,6,23,0.06)'
                              }}
                            >
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                                  <div style={{ fontWeight: 700, color: '#0f172a', flex: 1, minWidth: '200px' }}>
                                    <span style={{ color: '#4c51bf', fontWeight: 700, fontSize: 'clamp(12px, 2.5vw, 15px)' }}>{renderTeam(match.home_team, match)}</span>
                                    <span className={flashMap[match.id]?.home ? 'score-flash' : ''} style={{ margin: '0 clamp(6px, 2vw, 10px)', color: '#2b6cb0', fontSize: 'clamp(16px, 3vw, 18px)', fontWeight: 700 }}>{homeScore}</span>
                                    <span style={{ color: '#374151' }}>-</span>
                                    <span className={flashMap[match.id]?.away ? 'score-flash' : ''} style={{ margin: '0 clamp(6px, 2vw, 10px)', color: '#2b6cb0', fontSize: 'clamp(16px, 3vw, 18px)', fontWeight: 700 }}>{awayScore}</span>
                                    <span style={{ color: '#4c51bf', fontWeight: 700, fontSize: 'clamp(12px, 2.5vw, 15px)' }}>{renderTeam(match.away_team, match)}</span>
                                  </div>
                                  <div style={{ display: 'flex', gap: 'clamp(6px, 1vw, 8px)', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                    {match.awarded && (
                                      (() => {
                                        const reasonRaw = match.awarded_reason ? String(match.awarded_reason) : '';
                                        const reason = reasonRaw ? `(${reasonRaw.charAt(0).toUpperCase() + reasonRaw.slice(1)})` : '';
                                        const awardedToObj = match.awarded_to && typeof match.awarded_to === 'object' ? match.awarded_to : null;
                                        return (
                                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                                            <span style={{ padding: '6px 10px', borderRadius: 999, background: 'linear-gradient(90deg,#fff7ed,#fff1e6)', color: '#b45309', fontWeight: 800, fontSize: '12px', border: '1px solid rgba(234,88,12,0.12)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                                              <span style={{ fontSize: 14 }}>🚨</span>
                                              <span style={{ fontWeight: 800 }}>Awarded</span>
                                            </span>
                                            {/* Inline reason instead of hover */}
                                            {reason && <span style={{ fontSize: '12px', color: '#92400e', fontWeight: 700 }}>{reason}</span>}
                                            {/* Show awarded-to name only when available as an object with a name; do not show numeric IDs */}
                                            {awardedToObj && awardedToObj.name && (
                                              <span style={{ fontSize: '12px', color: '#0f172a', background: 'rgba(237,246,255,0.9)', padding: '4px 8px', borderRadius: 6, border: '1px solid rgba(2,6,23,0.04)', fontWeight: 600 }}>
                                                to {awardedToObj.name}
                                              </span>
                                            )}
                                          </span>
                                        );
                                      })()
                                    )}
                                    {match.awarded && (match.original_home_score !== null || match.original_away_score !== null) && (
                                      <span style={{ fontSize: '12px', color: '#7c2d12', background: 'rgba(255,247,237,0.7)', padding: '4px 8px', borderRadius: 6, border: '1px solid rgba(249,115,22,0.08)', fontWeight: 600 }}>
                                        Original: {match.original_home_score ?? '-'} - {match.original_away_score ?? '-'}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div style={{ fontSize: 'clamp(11px, 2vw, 13px)', color: '#6b7280', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                  <span>📅 {formatDate(match.match_date)}</span>
                                  {match.venue && <span>📍 {match.venue}</span>}
                                  {match.matchday && <span>🔢 MD {match.matchday}</span>}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()
        ) : (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: '#999'
          }}>
            <p style={{ fontSize: '18px' }}>No matches found for the selected season.</p>
            <p style={{ fontSize: '14px', marginTop: '8px' }}>Select a different season to view its matches.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Results;

