import React, { useEffect, useState } from 'react';
import { fetchWithAuth, logout } from '../api/auth';
import { useNavigate } from 'react-router-dom';

export default function ResultsEditor() {
    const nav = useNavigate();
    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        loadMatches();
    }, []);

    async function loadMatches() {
        setLoading(true);
        try {
            const res = await fetchWithAuth('https://ubakalaunitycup.onrender.com/api/matches/', {
                headers: {}
            });
            if (res.ok) {
                const data = await res.json();
                // Filter to matches not yet played (upcoming / live)
                const pending = (data || []).filter(m => !m.is_played);
                setMatches(pending);
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to load matches' });
        } finally {
            setLoading(false);
        }
    }

    async function setResult(matchId, home_score, away_score) {
        setMessage(null);
        try {
            const res = await fetchWithAuth(`https://ubakalaunitycup.onrender.com/api/matches/${matchId}/set_result/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ home_score, away_score })
            });
            if (!res.ok) {
                if (res.status === 403) {
                    setMessage({ type: 'error', text: 'Forbidden: you do not have permission to update results' });
                    return;
                }
                const err = await res.text();
                setMessage({ type: 'error', text: err || 'Failed to set result' });
            } else {
                setMessage({ type: 'success', text: 'Result updated' });
                loadMatches();
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Network error' });
        }
    }

    return (
        <div style={{ padding: 40 }}>
            <h2>Results Editor</h2>
            {message && <div style={{ padding: 12 }}>{message.text}</div>}
            {loading ? <p>Loading matches...</p> : (
                <div style={{ display: 'grid', gap: 12 }}>
                    {matches.map(m => (
                        <MatchRow key={m.id} match={m} onSetResult={setResult} />
                    ))}
                </div>
            )}
        </div>
    );
}

function MatchRow({ match, onSetResult }) {
    const [home, setHome] = useState(match.home_score || '');
    const [away, setAway] = useState(match.away_score || '');

    return (
        <div style={{ padding: 12, border: '1px solid #e5e7eb', borderRadius: 8 }}>
            <div style={{ fontWeight: 700 }}>{match.home_team.name} vs {match.away_team.name}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <input value={home} onChange={e => setHome(e.target.value)} style={{ width: 60 }} />
                <span> - </span>
                <input value={away} onChange={e => setAway(e.target.value)} style={{ width: 60 }} />
                <button onClick={() => onSetResult(match.id, home, away)}>Save</button>
            </div>
        </div>
    );
}
