import { useEffect, useState, useRef } from 'react';
import { api } from '../api/api';
import './Results.css';

const Results = () => {
  const [matches, setMatches] = useState([]);
  const [filteredMatches, setFilteredMatches] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState(null);

  useEffect(() => {
    // Fetch seasons
    api.getSeasons().then(data => {
      setSeasons(data);
      if (data.length > 0) {
        setSelectedSeason(data[0].id);
      }
    }).catch(console.error);
  }, []);

  useEffect(() => {
    const fetchScores = async () => {
      try {
        const data = await api.getMatches();
        // Compare with previous matches to detect pending->resolved transitions
        const prev = prevMatchesRef.current || {};
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
                // trigger highlight for this match id
                setHighlighted((h) => ({ ...h, [m.id]: true }));
                // clear highlight after a short duration
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
        setMatches(data || []);
        // store for next comparison
        prevMatchesRef.current = (data || []).reduce((acc, m) => { acc[m.id] = m; return acc; }, {});
      } catch (error) {
        console.error('Error fetching matches:', error);
        setMatches([]);
      }
    };

    fetchScores(); // initial fetch
    const interval = setInterval(fetchScores, 3000); // fetch every 3 seconds for near-realtime
    return () => clearInterval(interval); // cleanup on unmount
  }, []);

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
        {filteredMatches.length > 0 ? (
          (() => {
            const grouped = groupMatchesByStage(filteredMatches);
            const total = filteredMatches.length;
            return (
              <div>
                {/* Legend explaining badges */}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap' }}>
                  <div style={{ padding: 'clamp(4px, 1vw, 6px) clamp(8px, 2vw, 10px)', borderRadius: '999px', border: '1px solid rgba(15, 23, 42, 0.06)', background: 'rgba(248,250,252,0.6)', color: '#92400e', fontWeight: 600, fontSize: 'clamp(11px, 2vw, 13px)' }}>⏳ Pending</div>
                  <div style={{ padding: 'clamp(4px, 1vw, 6px) clamp(8px, 2vw, 10px)', borderRadius: '999px', border: '1px solid rgba(2, 6, 23, 0.06)', background: 'rgba(236,253,245,0.6)', color: '#065f46', fontWeight: 600, fontSize: 'clamp(11px, 2vw, 13px)' }}>✓ Resolved</div>
                  <div style={{ padding: 'clamp(4px, 1vw, 6px) clamp(8px, 2vw, 10px)', borderRadius: '999px', border: '1px solid rgba(2,6,23,0.04)', background: 'rgba(240,249,255,0.6)', color: '#075985', fontWeight: 600, fontSize: 'clamp(11px, 2vw, 13px)' }}>🏁 Played</div>
                  <div style={{ padding: 'clamp(4px, 1vw, 6px) clamp(8px, 2vw, 10px)', borderRadius: '999px', border: '1px solid rgba(127,29,29,0.06)', background: 'rgba(255,241,242,0.6)', color: '#7f1d1d', fontWeight: 600, fontSize: 'clamp(11px, 2vw, 13px)' }}>⚠️ Voided</div>
                  <div style={{ marginLeft: 'auto', padding: 'clamp(4px, 1vw, 6px) clamp(8px, 2vw, 10px)', borderRadius: '999px', border: '1px solid rgba(30,41,59,0.06)', background: 'rgba(238,242,255,0.6)', color: '#0f172a', fontWeight: 700, fontSize: 'clamp(11px, 2vw, 13px)' }}>📌 {total} match{total !== 1 ? 'es' : ''}</div>
                </div>

                {/* Compact bracket visual (Semifinals -> Final) */}
                {(() => {
                  // Use filteredMatches (current season) and coerce matchday to number
                  const sf1 = filteredMatches.find(m => Number(m.matchday) === 26) || null;
                  const sf2 = filteredMatches.find(m => Number(m.matchday) === 27) || null;
                  const third = filteredMatches.find(m => Number(m.matchday) === 28) || null;
                  const finalMatch = filteredMatches.find(m => Number(m.matchday) === 29) || null;
                  if (!sf1 && !sf2 && !finalMatch) return null;
                  const compactBox = (title, match) => (
                    <div style={{ minWidth: 'clamp(180px, 40vw, 220px)', padding: 'clamp(8px, 2vw, 10px)', borderRadius: '8px', background: '#ffffff', boxShadow: '0 1px 6px rgba(2,6,23,0.04)', border: '1px solid #e6eefb' }}>
                      <div style={{ fontSize: 'clamp(11px, 2vw, 13px)', color: '#0f172a', fontWeight: 800, marginBottom: 6 }}>{title}</div>
                      {match ? (
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 'clamp(12px, 2vw, 14px)' }}>{renderTeam(match.home_team, match)} <span style={{ color: '#2b6cb0', margin: '0 6px' }}>{match.home_score ?? '-'}</span></div>
                          <div style={{ fontWeight: 700, marginTop: 6, fontSize: 'clamp(12px, 2vw, 14px)' }}>{renderTeam(match.away_team, match)} <span style={{ color: '#2b6cb0', margin: '0 6px' }}>{match.away_score ?? '-'}</span></div>
                          <div style={{ marginTop: 8, fontSize: 'clamp(10px, 1.5vw, 12px)', color: '#6b7280' }}>MD {match.matchday} • {formatDate(match.match_date)}</div>
                        </div>
                      ) : (
                        <div style={{ color: '#94a3b8', fontSize: 'clamp(11px, 2vw, 12px)' }}>— not scheduled —</div>
                      )}
                    </div>
                  );

                  return (
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'stretch', marginBottom: '18px', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(8px, 2vw, 12px)', minWidth: 'clamp(160px, 45vw, 240px)', flex: 1 }}>
                        {compactBox('Semifinal 1', sf1)}
                        {compactBox('Semifinal 2', sf2)}
                      </div>
                      <div style={{ width: 'clamp(20px, 4vw, 36px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
                        {/* simple connector line */}
                        <div style={{ width: 2, background: 'linear-gradient(180deg, rgba(99,102,241,0.25), rgba(99,102,241,0.06))', flex: 1, borderRadius: 2 }} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(8px, 2vw, 12px)', minWidth: 'clamp(160px, 45vw, 240px)', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
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
                          const homeTeam = typeof match.home_team === 'object' ? match.home_team.name : match.home_team;
                          const awayTeam = typeof match.away_team === 'object' ? match.away_team.name : match.away_team;
                          const homeScore = match.home_score !== null ? match.home_score : '-';
                          const awayScore = match.away_score !== null ? match.away_score : '-';
                          const isPlayed = match.is_played;
                          const isVoid = !!match.void;
                          const homeIsPlaceholder = isPlaceholder(homeTeam);
                          const awayIsPlaceholder = isPlaceholder(awayTeam);
                          const pending = homeIsPlaceholder || awayIsPlaceholder;

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
                                    <span style={{ margin: '0 clamp(6px, 2vw, 10px)', color: '#2b6cb0', fontSize: 'clamp(16px, 3vw, 18px)', fontWeight: 700 }}>{homeScore}</span>
                                    <span style={{ color: '#374151' }}>-</span>
                                    <span style={{ margin: '0 clamp(6px, 2vw, 10px)', color: '#2b6cb0', fontSize: 'clamp(16px, 3vw, 18px)', fontWeight: 700 }}>{awayScore}</span>
                                    <span style={{ color: '#4c51bf', fontWeight: 700, fontSize: 'clamp(12px, 2.5vw, 15px)' }}>{renderTeam(match.away_team, match)}</span>
                                  </div>
                                  <div style={{ display: 'flex', gap: 'clamp(6px, 1vw, 8px)', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                    {/* Pending vs Resolved badge */}
                                    {pending ? (
                                      <div style={{ background: 'linear-gradient(90deg,#fb923c,#f97316)', color: 'white', padding: 'clamp(4px, 1vw, 6px) clamp(8px, 1.5vw, 10px)', borderRadius: '8px', fontWeight: 700, fontSize: 'clamp(10px, 1.5vw, 12px)', whiteSpace: 'nowrap' }}>⏳ Pending</div>
                                    ) : (
                                      <div style={{ background: 'linear-gradient(90deg,#34d399,#10b981)', color: '#052e1f', padding: 'clamp(4px, 1vw, 6px) clamp(8px, 1.5vw, 10px)', borderRadius: '8px', fontWeight: 700, fontSize: 'clamp(10px, 1.5vw, 12px)', whiteSpace: 'nowrap' }}>✓ Resolved</div>
                                    )}
                                    {isVoid && <div style={{ background: '#fee2e2', color: '#991b1b', padding: 'clamp(4px, 1vw, 6px) clamp(8px, 1.5vw, 10px)', borderRadius: '8px', fontWeight: 700, fontSize: 'clamp(10px, 1.5vw, 12px)', whiteSpace: 'nowrap' }}>⚠️ Voided</div>}
                                    {isPlayed && !isVoid && <div style={{ background: '#e6fffa', color: '#065f46', padding: 'clamp(4px, 1vw, 6px) clamp(8px, 1.5vw, 10px)', borderRadius: '8px', fontWeight: 700, fontSize: 'clamp(10px, 1.5vw, 12px)', whiteSpace: 'nowrap' }}>🏁 Played</div>}
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

