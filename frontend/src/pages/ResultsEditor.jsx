import React, { useEffect, useState } from 'react';
import { fetchWithAuth } from '../api/auth';

export default function ResultsEditor() {
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

    async function setResult(matchId, home_score, away_score, penalty_home = null, penalty_away = null) {
        setMessage(null);
        try {
            const payload = { home_score, away_score };
            if (penalty_home !== null && penalty_away !== null) {
                payload.penalty_home = penalty_home;
                payload.penalty_away = penalty_away;
            }

            const res = await fetchWithAuth(`https://ubakalaunitycup.onrender.com/api/matches/${matchId}/set_result/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!res.ok) {
                if (res.status === 403) {
                    setMessage({ type: 'error', text: 'Forbidden: you do not have permission to update results' });
                    return;
                }
                const err = await res.text();
                setMessage({ type: 'error', text: err || 'Failed to set result' });
            } else {
                const updated = await res.json();
                setMessage({ type: 'success', text: 'Result updated' });
                // Merge only score-related fields into the local match to avoid
                // accepting any backend-driven `is_played` change from set_result.
                setMatches((prev) => prev.map((m) => {
                    if (!m || m.id !== updated.id) return m;
                    return {
                        ...m,
                        home_score: updated.home_score,
                        away_score: updated.away_score,
                        penalty_home: updated.penalty_home,
                        penalty_away: updated.penalty_away,
                        actual_start: updated.actual_start,
                    };
                }));
                // Notify other parts of the app about score changes only.
                try {
                    window.dispatchEvent(new CustomEvent('match-scores-saved', { detail: updated }));
                } catch (e) {
                    // ignore if running in non-browser test env
                }
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Network error' });
        }
    }

    async function markFinished(matchId, extra_time_minutes = null) {
        setMessage(null);
        try {
            const payload = {};
            if (extra_time_minutes !== null) payload.extra_time_minutes = extra_time_minutes;
            const res = await fetchWithAuth(`https://ubakalaunitycup.onrender.com/api/matches/${matchId}/mark_finished/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!res.ok) {
                const err = await res.text();
                setMessage({ type: 'error', text: err || 'Failed to mark finished' });
                return null;
            }
            const updated = await res.json();
            setMessage({ type: 'success', text: 'Match marked finished' });
            setMatches((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
            try { window.dispatchEvent(new CustomEvent('match-updated', { detail: updated })); } catch (e) { }
            return updated;
        } catch (err) {
            setMessage({ type: 'error', text: 'Network error' });
            return null;
        }
    }

    return (
        <div style={{ padding: 20 }}>
            <h2 style={{ marginBottom: 12 }}>Results Editor</h2>
            {message && <div style={{ padding: 12 }}>{message.text}</div>}
            {loading ? <p>Loading matches...</p> : (
                <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
                    {matches.map(m => (
                        <MatchRow key={m.id} match={m} onSetResult={setResult} onMarkFinished={markFinished} />
                    ))}
                </div>
            )}
        </div>
    );
}

function MatchRow({ match, onSetResult, onMarkFinished }) {
    const [home, setHome] = useState(match.home_score ?? '');
    const [away, setAway] = useState(match.away_score ?? '');
    const [penHome, setPenHome] = useState('');
    const [penAway, setPenAway] = useState('');
    const [saving, setSaving] = useState(false);
    const [localMsg, setLocalMsg] = useState(null);
    const [finishing, setFinishing] = useState(false);

    const rawCategory = match?.season?.category || match.category || '';
    const category = formatCategory(rawCategory);
    const matchDate = match.match_date ? new Date(match.match_date).toLocaleString() : '';

    const isKnockout = Boolean(match.is_knockout) || (match.match_stage && String(match.match_stage).toLowerCase().includes('knock')) || (match.matchday && match.matchday >= 22);

    // Special-case override: force no-penalties for LAGURU vs MGBARAKUMA Senior Boys on 12/20/2025 4:00:00 PM
    const forceNoPen = (match.home_team?.name === 'LAGURU' && match.away_team?.name === 'MGBARAKUMA' && category === 'Senior Boys' && matchDate === '12/20/2025, 4:00:00 PM');
    const showPen = isKnockout && !forceNoPen;

    function onlyDigits(v) {
        return v === '' ? '' : String(v).replace(/[^0-9]/g, '');
    }

    function validateInputs() {
        if (home === '' || away === '') {
            setLocalMsg({ type: 'error', text: 'Enter both scores' });
            return false;
        }
        const h = parseInt(home, 10);
        const a = parseInt(away, 10);
        if (Number.isNaN(h) || Number.isNaN(a) || h < 0 || a < 0) {
            setLocalMsg({ type: 'error', text: 'Scores must be non-negative integers' });
            return false;
        }
        if (showPen && h === a) {
            const ph = penHome === '' ? null : parseInt(penHome, 10);
            const pa = penAway === '' ? null : parseInt(penAway, 10);
            if (ph === null || pa === null || Number.isNaN(ph) || Number.isNaN(pa) || ph < 0 || pa < 0) {
                setLocalMsg({ type: 'error', text: 'For knockout draws please provide penalty scores' });
                return false;
            }
        }
        setLocalMsg(null);
        return true;
    }

    async function save() {
        if (!validateInputs()) return;
        setSaving(true);
        try {
            const h = parseInt(home, 10);
            const a = parseInt(away, 10);
            let ph = null;
            let pa = null;
            if (showPen) {
                if (penHome !== '' && penAway !== '') {
                    ph = parseInt(penHome, 10);
                    pa = parseInt(penAway, 10);
                }
            }
            await onSetResult(match.id, h, a, ph, pa);
            setLocalMsg({ type: 'success', text: 'Saved' });
        } catch (err) {
            setLocalMsg({ type: 'error', text: 'Save failed' });
        } finally {
            setSaving(false);
        }
    }

    async function markFinished() {
        setFinishing(true);
        setLocalMsg(null);
        try {
            if (typeof onMarkFinished !== 'function') {
                setLocalMsg({ type: 'error', text: 'No handler to mark finished' });
                return;
            }
            await onMarkFinished(match.id);
            setLocalMsg({ type: 'success', text: 'Marked finished' });
        } catch (err) {
            setLocalMsg({ type: 'error', text: 'Failed to mark finished' });
        } finally {
            setFinishing(false);
        }
    }

    return (
        <div style={{ padding: 12, border: '1px solid #e5e7eb', borderRadius: 8, background: 'white', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <div style={{ fontWeight: 700, color: '#0f172a' }}>{match.home_team.name} vs {match.away_team.name}</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {category && (
                        <div style={{ background: '#eef2ff', color: '#3730a3', padding: '6px 8px', borderRadius: 6, fontWeight: 700, fontSize: 12 }}>
                            {category}
                        </div>
                    )}
                </div>
            </div>

            {matchDate && <div style={{ color: '#6b7280', fontSize: 13 }}>{matchDate}</div>}

            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <input value={home} onChange={e => setHome(onlyDigits(e.target.value))} style={{ width: '3.5rem', textAlign: 'center', fontWeight: 700, padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 6 }} />
                <span style={{ fontWeight: 700, color: '#0f172a' }}>-</span>
                <input value={away} onChange={e => setAway(onlyDigits(e.target.value))} style={{ width: '3.5rem', textAlign: 'center', fontWeight: 700, padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 6 }} />

                {showPen && (
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginLeft: 8 }}>
                        <div style={{ fontSize: 12, color: '#374151' }}>Pen:</div>
                        <input placeholder='H' value={penHome} onChange={e => setPenHome(onlyDigits(e.target.value))} style={{ width: '2.6rem', textAlign: 'center', padding: '4px 6px', border: '1px solid #e5e7eb', borderRadius: 6 }} />
                        <span style={{ fontWeight: 700, color: '#0f172a' }}>/</span>
                        <input placeholder='A' value={penAway} onChange={e => setPenAway(onlyDigits(e.target.value))} style={{ width: '2.6rem', textAlign: 'center', padding: '4px 6px', border: '1px solid #e5e7eb', borderRadius: 6 }} />
                    </div>
                )}

                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button disabled={saving} onClick={save} style={{ background: 'linear-gradient(90deg,#2563eb,#7c3aed)', color: 'white', border: 'none', padding: '8px 12px', borderRadius: 8, cursor: saving ? 'default' : 'pointer', fontWeight: 700 }}>{saving ? 'Saving...' : 'Save'}</button>
                    <button disabled={finishing} onClick={markFinished} title="Mark this match as finished" style={{ background: '#0ea5a4', color: 'white', border: 'none', padding: '6px 10px', borderRadius: 6, cursor: finishing ? 'default' : 'pointer', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                        {finishing ? 'Processing...' : 'Mark Finished'}
                    </button>
                </div>
            </div>

            {localMsg && <div style={{ fontSize: 13, color: localMsg.type === 'error' ? '#b91c1c' : '#065f46' }}>{localMsg.text}</div>}
        </div>
    );
}

function formatCategory(cat) {
    if (!cat) return '';
    const map = {
        junior_boys: 'Junior Boys',
        junior_girls: 'Junior Girls',
        senior_men: 'Senior Men',
        senior_women: 'Senior Women',
        u12_boys: 'U12 Boys'
    };
    if (map[cat]) return map[cat];
    return String(cat).split('_').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
}
