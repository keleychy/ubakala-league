import React, { useEffect, useState } from 'react';
import { callAdminApi } from '../api/adminApi';
import './LeaguePolish.css';

const MATCH_STATUS_OPTIONS = [
    { value: 'PENDING', label: 'Pending' },
    { value: 'SCHEDULED', label: 'Scheduled' },
    { value: 'LIVE', label: 'Live' },
    { value: 'POSTPONED', label: 'Postponed' },
    { value: 'FINISHED', label: 'Finished' },
    { value: 'AWARDED', label: 'Awarded' },
    { value: 'CANCELLED', label: 'Cancelled' },
    { value: 'ABANDONED', label: 'Abandoned' },
    { value: 'VOID', label: 'Void' }
];

const MATCH_PERIOD_OPTIONS = [
    { value: 'NOT_STARTED', label: 'Not started' },
    { value: 'FIRST_HALF', label: '1st Half' },
    { value: 'HALFTIME', label: 'Half Time' },
    { value: 'SECOND_HALF', label: '2nd Half' },
    { value: 'ENDED', label: 'Ended' }
];

function normalizePeriod(value) {
    const normalized = String(value || 'NOT_STARTED')
        .trim()
        .toUpperCase()
        .replace(/[\s-]+/g, '_');
    if (normalized === '1ST_HALF') return 'FIRST_HALF';
    if (normalized === '2ND_HALF') return 'SECOND_HALF';
    if (normalized === 'HALF_TIME') return 'HALFTIME';
    return normalized;
}

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
            const data = await callAdminApi('admin.matches.list');
            const editable = (data || []).filter(match =>
                !['FINISHED', 'AWARDED', 'CANCELLED', 'VOID'].includes(
                    String(match.status || '').toUpperCase()
                )
            );
            setMatches(editable);
        } catch (err) {
            setMessage({ type: 'error', text: err.message || 'Failed to load matches' });
        } finally {
            setLoading(false);
        }
    }

    async function setResult(matchId, home_score, away_score, penalty_home = null, penalty_away = null) {
        setMessage(null);
        try {
            const payload = { id: matchId, home_score, away_score };
            if (penalty_home !== null && penalty_away !== null) {
                payload.penalty_home = penalty_home;
                payload.penalty_away = penalty_away;
            }
            const updated = await callAdminApi('admin.matches.setResult', payload);
            setMessage({ type: 'success', text: 'Result updated' });
            setMatches(prev => prev.map(match =>
                match.id === updated.id ? { ...match, ...updated } : match
            ));
            window.dispatchEvent(new CustomEvent('match-scores-saved', { detail: updated }));
            return updated;
        } catch (err) {
            setMessage({ type: 'error', text: err.message || 'Failed to set result' });
            throw err;
        }
    }

    async function setMatchPeriod(matchId, current_period) {
        const updated = await callAdminApi('admin.matches.setPeriod', {
            id: matchId,
            current_period
        });
        setMatches(prev => prev.map(match =>
            match.id === updated.id ? { ...match, ...updated } : match
        ));
        window.dispatchEvent(new CustomEvent('match-updated', { detail: updated }));
        return updated;
    }

    async function setMatchStatus(matchId, status) {
        const updated = await callAdminApi('admin.matches.setStatus', {
            id: matchId,
            status
        });
        const terminalStatuses = ['FINISHED', 'AWARDED', 'CANCELLED', 'VOID'];
        setMatches(prev => terminalStatuses.includes(updated.status)
            ? prev.filter(match => match.id !== updated.id)
            : prev.map(match => match.id === updated.id ? { ...match, ...updated } : match)
        );
        window.dispatchEvent(new CustomEvent('match-updated', { detail: updated }));
        return updated;
    }

    async function markFinished(matchId, extra_time_minutes = null) {
        setMessage(null);
        try {
            const updated = await callAdminApi('admin.matches.markFinished', {
                id: matchId,
                extra_time_minutes
            });
            setMessage({ type: 'success', text: 'Match marked finished' });
            setMatches(prev => prev.filter(match => match.id !== updated.id));
            window.dispatchEvent(new CustomEvent('match-updated', { detail: updated }));
            return updated;
        } catch (err) {
            setMessage({ type: 'error', text: err.message || 'Failed to mark finished' });
            return null;
        }
    }

    return (
        <div className="league-polish-page">
          <main className="league-polish-content">
            <header className="league-page-header">
                <div className="league-page-header__copy">
                    <div className="league-page-eyebrow">Match administration</div>
                    <h1 className="league-page-title">Results Editor</h1>
                    <p className="league-page-subtitle">Update scores, match periods and final results.</p>
                </div>
            </header>
            {message && <div className={`league-page-status${message.type === 'error' ? ' league-page-status--error' : ''}`}>{message.text}</div>}
            {loading ? <p>Loading matches...</p> : (
                <div className="league-page-grid">
                    {matches.map(m => (
                        <MatchRow
                            key={m.id}
                            match={m}
                            onSetResult={setResult}
                            onSetMatchPeriod={setMatchPeriod}
                            onSetMatchStatus={setMatchStatus}
                            onMarkFinished={markFinished}
                        />
                    ))}
                </div>
            )}
          </main>
        </div>
    );
}

function MatchRow({
    match,
    onSetResult,
    onSetMatchPeriod,
    onSetMatchStatus,
    onMarkFinished
}) {
    const [home, setHome] = useState(match.home_score ?? '');
    const [away, setAway] = useState(match.away_score ?? '');
    const [penHome, setPenHome] = useState('');
    const [penAway, setPenAway] = useState('');
    const [period, setPeriod] = useState(normalizePeriod(match.current_period));
    const [status, setStatus] = useState(
        String(match.status || 'PENDING').trim().toUpperCase()
    );
    const [saving, setSaving] = useState(false);
    const [savingPeriod, setSavingPeriod] = useState(false);
    const [savingStatus, setSavingStatus] = useState(false);
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
        // Do not require penalty scores when saving interim/ongoing knockout matches.
        // Penalties are only required when marking a knockout match finished.
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
            const h = parseInt(home === '' ? '0' : home, 10);
            const a = parseInt(away === '' ? '0' : away, 10);
            // If knockout and match is tied, require penalty scores before finishing
            if (showPen && h === a) {
                if (penHome === '' || penAway === '') {
                    setLocalMsg({ type: 'error', text: 'Provide penalty scores before marking finished' });
                    return;
                }
                const ph = parseInt(penHome, 10);
                const pa = parseInt(penAway, 10);
                if (Number.isNaN(ph) || Number.isNaN(pa) || ph < 0 || pa < 0) {
                    setLocalMsg({ type: 'error', text: 'Penalty scores must be non-negative integers' });
                    return;
                }
                // Save penalty scores first so backend records them, then mark finished
                await onSetResult(match.id, h, a, ph, pa);
            } else {
                // Save the current scores (ensure latest) before finishing
                await onSetResult(match.id, parseInt(home || '0', 10), parseInt(away || '0', 10));
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
        <div className="league-match-editor-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <div style={{ fontWeight: 700, color: '#0f172a' }}>{match.home_team.name} vs {match.away_team.name}</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {category && (
                        <div style={{ background: '#eef2ff', color: '#3730a3', padding: '6px 8px', borderRadius: 6, fontWeight: 700, fontSize: 12 }}>
                            {category}
                        </div>
                    )}
                    <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
                        Status
                        <select
                            aria-label={`Status for ${match.home_team.name} vs ${match.away_team.name}`}
                            value={status}
                            disabled={savingStatus}
                            onChange={async e => {
                                const nextStatus = e.target.value.toUpperCase();
                                const previousStatus = status;
                                setStatus(nextStatus);
                                setSavingStatus(true);
                                setLocalMsg(null);
                                try {
                                    await onSetMatchStatus(match.id, nextStatus);
                                    setLocalMsg({ type: 'success', text: 'Status saved' });
                                } catch (err) {
                                    setStatus(previousStatus);
                                    setLocalMsg({ type: 'error', text: err.message || 'Failed to save status' });
                                } finally {
                                    setSavingStatus(false);
                                }
                            }}
                            style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 12 }}
                        >
                            {!MATCH_STATUS_OPTIONS.some(option => option.value === status) && (
                                <option value={status}>{status}</option>
                            )}
                            {MATCH_STATUS_OPTIONS.map(option => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
                        Period
                        <select
                            aria-label={`Current period for ${match.home_team.name} vs ${match.away_team.name}`}
                            value={period}
                            disabled={savingPeriod}
                            onChange={async e => {
                                const nextPeriod = normalizePeriod(e.target.value);
                                const previousPeriod = period;
                                setPeriod(nextPeriod);
                                setSavingPeriod(true);
                                setLocalMsg(null);
                                try {
                                    await onSetMatchPeriod(match.id, nextPeriod);
                                    setLocalMsg({ type: 'success', text: 'Period saved' });
                                } catch (err) {
                                    setPeriod(previousPeriod);
                                    setLocalMsg({ type: 'error', text: err.message || 'Failed to save period' });
                                } finally {
                                    setSavingPeriod(false);
                                }
                            }}
                            style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 12 }}
                        >
                            {!MATCH_PERIOD_OPTIONS.some(option => option.value === period) && (
                                <option value={period}>{period}</option>
                            )}
                            {MATCH_PERIOD_OPTIONS.map(option => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </label>
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
