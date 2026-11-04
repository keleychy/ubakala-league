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
    { value: 'VOID', label: 'Void' },
];

const MATCH_PERIOD_OPTIONS = [
    { value: 'NOT_STARTED', label: 'Not Started' },
    { value: 'FIRST_HALF', label: 'First Half' },
    { value: 'HALFTIME', label: 'Half Time' },
    { value: 'SECOND_HALF', label: 'Second Half' },
    { value: 'FULL_TIME ', label: 'Full Time' },
];

function normalizePeriod(value) {
    return String(value || '')
        .trim()
        .toUpperCase()
        .replace(/[\s-]+/g, '_');
}

function formatCategory(match) {
    const category = match?.category || match?.competition_category || match?.stage || '';

    if (!category) return 'Match';

    return String(category)
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function MatchRow({ match, onUpdated }) {
    const [homeScore, setHomeScore] = useState(match.home_score ?? '');
    const [awayScore, setAwayScore] = useState(match.away_score ?? '');
    const [homePenalties, setHomePenalties] = useState(match.home_penalties ?? '');
    const [awayPenalties, setAwayPenalties] = useState(match.away_penalties ?? '');
    const [status, setStatus] = useState(match.status || 'SCHEDULED');
    const [period, setPeriod] = useState(normalizePeriod(match.current_period || 'NOT_STARTED'));
    const [saving, setSaving] = useState(false);
    const [savingPeriod, setSavingPeriod] = useState(false);
    const [savingStatus, setSavingStatus] = useState(false);
    const [finishing, setFinishing] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        setHomeScore(match.home_score ?? '');
        setAwayScore(match.away_score ?? '');
        setHomePenalties(match.home_penalties ?? '');
        setAwayPenalties(match.away_penalties ?? '');
        setStatus(match.status || 'SCHEDULED');
        setPeriod(normalizePeriod(match.current_period || 'NOT_STARTED'));
    }, [match]);

    const isKnockout = Boolean(
        match.stage &&
        String(match.stage).toLowerCase().includes('knockout')
    );

    const isLaguruMgbarakumaSeniorBoys =
        String(match.home_team_name || '').toUpperCase().includes('LAGURU') &&
        String(match.away_team_name || '').toUpperCase().includes('MGBARAKUMA') &&
        String(match.category || match.competition_category || '').toUpperCase().includes('SENIOR BOYS');

    const showPenalties =
        isKnockout &&
        homeScore !== '' &&
        awayScore !== '' &&
        Number(homeScore) === Number(awayScore);

    const handleSaveResult = async () => {
        setMessage('');

        if (homeScore === '' || awayScore === '') {
            setMessage('Enter both team scores before saving.');
            return;
        }

        if (
            showPenalties &&
            (homePenalties === '' || awayPenalties === '')
        ) {
            setMessage('Enter both penalty scores before saving.');
            return;
        }

        const payload = {
            match_id: match.id,
            home_score: Number(homeScore),
            away_score: Number(awayScore),
        };

        if (showPenalties) {
            payload.home_penalties = Number(homePenalties);
            payload.away_penalties = Number(awayPenalties);
        }

        try {
            setSaving(true);

            await callAdminApi('admin.matches.setResult', payload);

            setMessage('Result saved successfully.');

            window.dispatchEvent(new CustomEvent('match-scores-saved'));
            window.dispatchEvent(new CustomEvent('match-updated'));

            if (onUpdated) onUpdated();
        } catch (error) {
            setMessage(error?.message || 'Unable to save result.');
        } finally {
            setSaving(false);
        }
    };

    const handleSavePeriod = async () => {
        setMessage('');

        try {
            setSavingPeriod(true);

            await callAdminApi('admin.matches.setPeriod', {
                match_id: match.id,
                current_period: period,
            });

            setMessage('Match period updated.');

            window.dispatchEvent(new CustomEvent('match-updated'));

            if (onUpdated) onUpdated();
        } catch (error) {
            setMessage(error?.message || 'Unable to update match period.');
        } finally {
            setSavingPeriod(false);
        }
    };

    const handleSaveStatus = async () => {
        setMessage('');

        try {
            setSavingStatus(true);

            await callAdminApi('admin.matches.setStatus', {
                match_id: match.id,
                status,
            });

            setMessage('Match status updated.');

            window.dispatchEvent(new CustomEvent('match-updated'));

            if (onUpdated) onUpdated();
        } catch (error) {
            setMessage(error?.message || 'Unable to update match status.');
        } finally {
            setSavingStatus(false);
        }
    };

    const handleMarkFinished = async () => {
        setMessage('');

        try {
            setFinishing(true);

            await callAdminApi('admin.matches.markFinished', {
                match_id: match.id,
            });

            setStatus('FINISHED');
            setPeriod('FULL_TIME');

            setMessage('Match marked as finished.');

            window.dispatchEvent(new CustomEvent('match-updated'));

            if (onUpdated) onUpdated();
        } catch (error) {
            setMessage(error?.message || 'Unable to finish match.');
        } finally {
            setFinishing(false);
        }
    };

    return (
        <div className="results-match-card">
            <div className="results-match-top">
                <div className="results-match-identity">
                    <div className="results-match-category">
                        {formatCategory(match)}
                    </div>

                    <div className="results-match-teams">
                        <span className="results-team-name">
                            {match.home_team_name || 'Home Team'}
                        </span>

                        <span className="results-vs">VS</span>

                        <span className="results-team-name">
                            {match.away_team_name || 'Away Team'}
                        </span>
                    </div>

                    <div className="results-match-meta">
                        {match.match_date && (
                            <span>{match.match_date}</span>
                        )}

                        {match.kickoff_time && (
                            <span>{match.kickoff_time}</span>
                        )}

                        {match.venue && (
                            <span>{match.venue}</span>
                        )}
                    </div>
                </div>

                <div className="results-match-controls">
                    <div className="results-control-group">
                        <label htmlFor={`status-${match.id}`}>
                            Match Status
                        </label>

                        <select
                            id={`status-${match.id}`}
                            value={status}
                            onChange={(event) => setStatus(event.target.value)}
                        >
                            {MATCH_STATUS_OPTIONS.map((option) => (
                                <option
                                    key={option.value}
                                    value={option.value}
                                >
                                    {option.label}
                                </option>
                            ))}
                        </select>

                        <button
                            type="button"
                            className="results-small-button"
                            onClick={handleSaveStatus}
                            disabled={savingStatus}
                        >
                            {savingStatus ? 'Saving...' : 'Update Status'}
                        </button>
                    </div>

                    <div className="results-control-group">
                        <label htmlFor={`period-${match.id}`}>
                            Current Period
                        </label>

                        <select
                            id={`period-${match.id}`}
                            value={period}
                            onChange={(event) => setPeriod(event.target.value)}
                        >
                            {MATCH_PERIOD_OPTIONS.map((option) => (
                                <option
                                    key={normalizePeriod(option.value)}
                                    value={normalizePeriod(option.value)}
                                >
                                    {option.label}
                                </option>
                            ))}
                        </select>

                        <button
                            type="button"
                            className="results-small-button"
                            onClick={handleSavePeriod}
                            disabled={savingPeriod}
                        >
                            {savingPeriod ? 'Saving...' : 'Update Period'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="results-score-section">
                <div className="results-score-heading">
                    <span>Enter Match Result</span>
                    <small>Input the official scores for both teams.</small>
                </div>

                <div className="results-score-inputs">
                    <div className="results-score-team">
                        <label>{match.home_team_name || 'Home Team'}</label>

                        <input
                            type="number"
                            min="0"
                            value={homeScore}
                            onChange={(event) => setHomeScore(event.target.value)}
                            placeholder="0"
                        />
                    </div>

                    <div className="results-score-separator">:</div>

                    <div className="results-score-team">
                        <label>{match.away_team_name || 'Away Team'}</label>

                        <input
                            type="number"
                            min="0"
                            value={awayScore}
                            onChange={(event) => setAwayScore(event.target.value)}
                            placeholder="0"
                        />
                    </div>
                </div>

                {showPenalties && (
                    <div className="results-penalty-section">
                        <div className="results-penalty-heading">
                            Penalty Shootout
                        </div>

                        <div className="results-score-inputs">
                            <div className="results-score-team">
                                <label>
                                    {match.home_team_name || 'Home Team'} Penalties
                                </label>

                                <input
                                    type="number"
                                    min="0"
                                    value={homePenalties}
                                    onChange={(event) => setHomePenalties(event.target.value)}
                                    placeholder="0"
                                />
                            </div>

                            <div className="results-score-separator">:</div>

                            <div className="results-score-team">
                                <label>
                                    {match.away_team_name || 'Away Team'} Penalties
                                </label>

                                <input
                                    type="number"
                                    min="0"
                                    value={awayPenalties}
                                    onChange={(event) => setAwayPenalties(event.target.value)}
                                    placeholder="0"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {message && (
                    <div className="results-feedback">
                        {message}
                    </div>
                )}

                <div className="results-action-buttons">
                    <button
                        type="button"
                        className="results-save-button"
                        onClick={handleSaveResult}
                        disabled={saving}
                    >
                        {saving ? 'Saving Result...' : 'Save Result'}
                    </button>

                    <button
                        type="button"
                        className="results-finish-button"
                        onClick={handleMarkFinished}
                        disabled={finishing}
                    >
                        {finishing ? 'Updating...' : 'Mark Match Finished'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function ResultsEditor() {
    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [refreshing, setRefreshing] = useState(false);

    const loadMatches = async () => {
        try {
            setError('');

            const response = await callAdminApi('admin.matches.list', {});

            const matchList = Array.isArray(response)
                ? response
                : response?.matches || response?.data || [];

            const activeMatches = matchList.filter((match) => {
                const currentStatus = String(match.status || '').toUpperCase();

                return ![
                    'FINISHED',
                    'AWARDED',
                    'CANCELLED',
                    'VOID',
                ].includes(currentStatus);
            });

            setMatches(activeMatches);
        } catch (err) {
            setError(err?.message || 'Unable to load matches.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadMatches();

        const handleMatchUpdate = () => {
            loadMatches();
        };

        window.addEventListener('match-updated', handleMatchUpdate);
        window.addEventListener('match-scores-saved', handleMatchUpdate);

        return () => {
            window.removeEventListener('match-updated', handleMatchUpdate);
            window.removeEventListener('match-scores-saved', handleMatchUpdate);
        };
    }, []);

    const handleRefresh = () => {
        setRefreshing(true);
        loadMatches();
    };

    if (loading) {
        return (
            <div className="results-editor-page">
                <div className="results-editor-loading">
                    Loading matches...
                </div>
            </div>
        );
    }

    return (
        <div className="results-editor-page">
            <div className="results-editor-header">
                <div>
                    <h2>Results Editor</h2>
                    <p>
                        Manage match scores, match status and current playing period.
                    </p>
                </div>

                <button
                    type="button"
                    className="results-refresh-button"
                    onClick={handleRefresh}
                    disabled={refreshing}
                >
                    {refreshing ? 'Refreshing...' : 'Refresh Matches'}
                </button>
            </div>

            {error && (
                <div className="results-editor-error">
                    {error}
                </div>
            )}

            <div className="results-editor-summary">
                <div>
                    <strong>{matches.length}</strong>
                    <span>Active Matches</span>
                </div>
            </div>

            {matches.length === 0 ? (
                <div className="results-editor-empty">
                    <h3>No Active Matches</h3>
                    <p>
                        There are currently no matches available for result entry.
                    </p>
                </div>
            ) : (
                <div className="results-match-list">
                    {matches.map((match) => (
                        <MatchRow
                            key={match.id}
                            match={match}
                            onUpdated={loadMatches}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}