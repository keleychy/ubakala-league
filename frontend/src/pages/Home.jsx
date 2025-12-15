import React, { useState } from 'react';
import { api } from '../api/api';
import { Link, useNavigate } from 'react-router-dom';
import './Results.css';
import usePolling from '../utils/usePolling';

export default function Home() {
  const [teams, setTeams] = useState([]);
  const [matches, setMatches] = useState([]);
  const [matchesLoading, setMatchesLoading] = useState(true);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [showingTomorrow, setShowingTomorrow] = useState(false);
  const [teamsLoadedOnce, setTeamsLoadedOnce] = useState(false);
  const [matchesLoadedOnce, setMatchesLoadedOnce] = useState(false);
  const navigate = useNavigate();

  // Fetch teams and matches periodically (every 5-10s with jitter)
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

      const todayMatches = (data || []).filter(match => {
        const matchDate = new Date(match.match_date);
        return matchDate >= today && matchDate < tomorrow;
      }).slice(0, 3);

      if (todayMatches.length > 0) {
        setMatches(todayMatches);
        setShowingTomorrow(false);
      } else {
        const tomorrowMatches = (data || []).filter(match => {
          const matchDate = new Date(match.match_date);
          return matchDate >= tomorrow && matchDate < dayAfter;
        }).slice(0, 3);
        setMatches(tomorrowMatches);
        setShowingTomorrow(true);
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (!matchesLoadedOnce) setMatchesLoading(false);
      setMatchesLoadedOnce(true);
    }
  };

  usePolling(fetchTeams, { minInterval: 5000, maxInterval: 10000, immediate: true });
  usePolling(fetchMatches, { minInterval: 5000, maxInterval: 10000, immediate: true });

  function getLocalMatchTime(dateStr) {
    // Try to parse as ISO, fallback to manual conversion
    let d = new Date(dateStr);
    if (isNaN(d)) {
      // If backend sends 'YYYY-MM-DD HH:mm:ss', convert to ISO
      d = new Date(dateStr.replace(' ', 'T') + '+01:00');
    }
    return isNaN(d) ? dateStr : d.toLocaleString();
  }

  function formatTeamName(name) {
    if (!name) return '';
    // Remove bracketed content like "[x]" or "(x)" and trim
    // Match either [...] or (...) to avoid unnecessary escapes inside character classes
    // eslint-disable-next-line no-useless-escape
    return String(name).replace(/\s*(?:\[[^\]]*\]|\([^)]*\))\s*/g, '').trim();
  }

  return (
    <div style={{ paddingBottom: '40px' }}>
      {/* Hero Section */}
      <section style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '60px 32px',
        textAlign: 'center',
        borderRadius: '0',
        marginTop: '0',
        marginLeft: '0',
        marginRight: '0',
        maxWidth: '100%'
      }}>
        <h1 style={{
          fontSize: '48px',
          fontWeight: '800',
          marginBottom: '12px',
          color: 'white'
        }}>⚽ UBAKALA UNITY CUP</h1>
        <p style={{
          fontSize: '18px',
          marginBottom: '20px',
          opacity: '0.95',
          lineHeight: '1.6'
        }}>Uniting communities through football. Live results, standings and news for the ongoing cup competitions.</p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '24px' }}>
          <Link to="/history"><button style={{
            background: 'rgba(255, 255, 255, 0.25)',
            color: 'white',
            border: '2px solid white',
            padding: '12px 24px',
            fontSize: '14px',
            fontWeight: '600'
          }}>📜 View History</button></Link>
          <Link to="/results"><button style={{ padding: '12px 24px', fontSize: '14px', fontWeight: '600' }}>📊 Results</button></Link>
          <Link to="/standings"><button style={{ padding: '12px 24px', fontSize: '14px', fontWeight: '600' }}>🏆 Standings</button></Link>
          <Link to="/news"><button style={{ padding: '12px 24px', fontSize: '14px', fontWeight: '600' }}>📰 News</button></Link>
          <Link to="/admin"><button style={{ padding: '12px 24px', fontSize: '14px', fontWeight: '600' }}>🔐 Admin</button></Link>
        </div>
      </section>

      {/* Today's Matches Section */}
      <section style={{
        marginTop: '40px',
        marginBottom: '40px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        <h2 style={{
          textAlign: 'center',
          borderBottom: '4px solid #667eea',
          paddingBottom: '15px',
          marginBottom: '30px',
          width: '100%',
          color: '#1e3c72',
          fontSize: '32px'
        }}>
          🎯 {showingTomorrow ? "Tomorrow's Matches" : "Today's Matches"}
        </h2>
        {matchesLoading ? (
          <div className="loading">Loading matches <span className="loading-dots"><span></span><span></span><span></span></span></div>
        ) : matches.length > 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'row',
            gap: '20px',
            flexWrap: 'wrap',
            justifyContent: 'center',
            width: '100%'
          }}>
            {matches.map((match) => {
              const homeTeam = typeof match.home_team === 'object' ? match.home_team.name : match.home_team;
              const awayTeam = typeof match.away_team === 'object' ? match.away_team.name : match.away_team;
              const homeScore = match.home_score !== null ? match.home_score : '-';
              const awayScore = match.away_score !== null ? match.away_score : '-';
              return (
                <div
                  key={match.id}
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    padding: '24px',
                    borderRadius: '12px',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
                    textAlign: 'center',
                    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                    cursor: 'pointer',
                    flex: '1 1 calc(33.333% - 20px)',
                    minWidth: '280px',
                    maxWidth: '380px',
                    color: 'white'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-8px)';
                    e.currentTarget.style.boxShadow = '0 16px 32px rgba(0, 0, 0, 0.25)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.15)';
                  }}
                  onClick={() => navigate(`/results?matchId=${match.id}`)}
                >
                  <div style={{
                    fontSize: '12px',
                    fontWeight: 'bold',
                    color: '#e0d4ff',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    marginBottom: '12px'
                  }}>
                    {match.season?.name || 'League Match'} • {match.match_stage || 'Match'}
                  </div>
                  {match.void && (
                    <div style={{
                      display: 'inline-block',
                      background: 'rgba(220,38,38,0.25)',
                      color: '#ff6b6b',
                      padding: '6px 12px',
                      borderRadius: '999px',
                      fontSize: '12px',
                      fontWeight: '700',
                      marginBottom: '12px',
                      border: '1px solid rgba(255, 107, 107, 0.5)'
                    }}>⚠️ Voided</div>
                  )}
                  <div style={{
                    fontSize: '20px',
                    fontWeight: 'bold',
                    color: '#fff',
                    marginBottom: '12px',
                    lineHeight: '1.4'
                  }}>
                    <div style={{ fontSize: '16px', fontWeight: '500' }}>{homeTeam}</div>
                    <div style={{ fontSize: '32px', margin: '8px 0', color: '#ffd700', fontWeight: '800' }}>
                      {homeScore} - {awayScore}
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: '500' }}>{awayTeam}</div>
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: '#e0d4ff',
                    marginTop: '12px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.2)',
                    paddingTop: '12px'
                  }}>
                    <div style={{ fontWeight: '600' }}>⏰ {getLocalMatchTime(match.match_date)}</div>
                    {match.venue && <div style={{ marginTop: '4px', fontSize: '11px' }}>📍 {match.venue}</div>}
                  </div>
                  {
                    match.is_played && (
                      <div style={{
                        fontSize: '12px',
                        fontWeight: 'bold',
                        color: '#4ade80',
                        marginTop: '10px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        ✓ Match Completed
                      </div>
                    )
                  }
                </div>
              );
            })}
          </div>
        ) : (
          <p style={{ color: '#999', textAlign: 'center', fontSize: '16px', padding: '40px 20px' }}>
            No matches scheduled for today. Check back soon! 📅
          </p>
        )
        }
      </section>

      {/* Teams Section */}
      <section style={{ marginTop: '40px' }}>
        <h3 style={{ color: '#1e3c72', fontSize: '24px', marginBottom: '20px' }}>🏟️ Participating Teams</h3>
        {teamsLoading ? (
          <div className="loading">Loading teams <span className="loading-dots"><span></span><span></span><span></span></span></div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
            gap: '16px'
          }}>
            {teams.map(t => (
              <div
                key={t.id}
                style={{
                  border: '2px solid #667eea',
                  padding: '16px',
                  borderRadius: '10px',
                  textAlign: 'center',
                  background: '#f8f9ff',
                  fontWeight: '600',
                  color: '#1e3c72',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                  e.currentTarget.style.color = 'white';
                  e.currentTarget.style.transform = 'translateY(-4px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#f8f9ff';
                  e.currentTarget.style.color = '#1e3c72';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {formatTeamName(t.name)}
              </div>
            ))}
          </div>
        )}
      </section>
    </div >
  );
}
