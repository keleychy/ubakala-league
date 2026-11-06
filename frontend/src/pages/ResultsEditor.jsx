import React, { useEffect, useState } from 'react';
import { callAdminApi } from '../api/adminApi';
import {
    getCompetitionCategoryLabel,
    getMatchCategory,
    getMatchStageLabel,
    PUBLIC_CATEGORIES
} from '../utils/competition';
import './LeaguePolish.css';

const MATCHES_PER_PAGE = 10;

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
    { value: 'ENDED', label: 'Full Time' },
];

function normalizePeriod(value) {
    return String(value || '')
        .trim()
        .toUpperCase()
        .replace(/[\s-]+/g, '_');
}

function formatCategory(match) {
    return getCompetitionCategoryLabel(getMatchCategory(match));
}

function formatStage(match) {
    return getMatchStageLabel(match);
}

function getMatchStatus(match) {
    return String(match.status || 'SCHEDULED').trim().toUpperCase();
}

function MatchRow({ match, onUpdated }) {
    const [homeScore, setHomeScore] = useState(match.home_score ?? '');
    const [awayScore, setAwayScore] = useState(match.away_score ?? '');
    const [homePenalties, setHomePenalties] = useState(match.home_penalties ?? '');
    const [awayPenalties, setAwayPenalties] = useState(match.away_penalties ?? '');
    const [status, setStatus] = useState(
        String(match.status || 'SCHEDULED').trim().toUpperCase()
    );
    const [period, setPeriod] = useState(
        normalizePeriod(match.current_period || 'NOT_STARTED')
    );

    const [saving, setSaving] = useState(false);
    const [savingPeriod, setSavingPeriod] = useState(false);
    const [savingStatus, setSavingStatus] = useState(false);
    const [finishing, setFinishing] = useState(false);
    const [reopenFormOpen, setReopenFormOpen] = useState(false);
    const [reopenReason, setReopenReason] = useState('');
    const [correctionReason, setCorrectionReason] = useState('');
    const [reopening, setReopening] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        setHomeScore(match.home_score ?? '');
        setAwayScore(match.away_score ?? '');
        setHomePenalties(match.home_penalties ?? '');
        setAwayPenalties(match.away_penalties ?? '');
        setStatus(String(match.status || 'SCHEDULED').trim().toUpperCase());
        setPeriod(normalizePeriod(match.current_period || 'NOT_STARTED'));
    }, [match]);

    const stage = String(match.stage || match.match_stage || '')
        .trim()
        .toUpperCase()
        .replace(/[\s-]+/g, '_');
    const isKnockout = Boolean(stage && !['GROUP', 'GROUP_STAGE'].includes(stage));

    const showPenalties =
        isKnockout &&
        homeScore !== '' &&
        awayScore !== '' &&
        Number(homeScore) === Number(awayScore);
    const statusLabel =
        MATCH_STATUS_OPTIONS.find((option) => option.value === status)?.label ||
        status;
    const isFinished = getMatchStatus(match) === 'FINISHED';

    const handleSaveResult = async () => {
        setMessage('');

        if (homeScore === '' || awayScore === '') {
            setMessage('Enter both team scores before saving.');
            return;
        }

        const scoreChanged =
            String(homeScore) !== String(match.home_score ?? '') ||
            String(awayScore) !== String(match.away_score ?? '') ||
            String(homePenalties) !== String(match.home_penalties ?? '') ||
            String(awayPenalties) !== String(match.away_penalties ?? '');

        if (isFinished && scoreChanged && !correctionReason.trim()) {
            setMessage('Enter a reason for correcting this finished match.');
            return;
        }

        if (isFinished && scoreChanged && !window.confirm(
            'Save this score correction and keep the match marked as finished?'
        )) {
            return;
        }

        const payload = {
            match_id: match.id,
            home_score: Number(homeScore),
            away_score: Number(awayScore),
        };

        if (isFinished && scoreChanged) {
            payload.reason = correctionReason.trim();
        }

        if (showPenalties) {
            if (homePenalties === '' || awayPenalties === '') {
                setMessage('Enter both penalty scores before saving.');
                return;
            }

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
            setPeriod('ENDED');

            setMessage('Match marked as finished.');

            window.dispatchEvent(new CustomEvent('match-updated'));

            if (onUpdated) onUpdated();
        } catch (error) {
            setMessage(error?.message || 'Unable to finish match.');
        } finally {
            setFinishing(false);
        }
    };

    const handleReopenMatch = async () => {
        setMessage('');
        if (!reopenReason.trim()) {
            setMessage('Enter a reason for reopening this match.');
            return;
        }

        try {
            setReopening(true);
            await callAdminApi('admin.matches.reopen', {
                match_id: match.id,
                reason: reopenReason.trim(),
            });
            setStatus('SCHEDULED');
            setPeriod('NOT_STARTED');
            setReopenFormOpen(false);
            setReopenReason('');
            setMessage('Match reopened and returned to Scheduled.');
            window.dispatchEvent(new CustomEvent('match-updated'));
            if (onUpdated) onUpdated();
        } catch (error) {
            setMessage(error?.message || 'Unable to reopen match.');
        } finally {
            setReopening(false);
        }
    };

    return (
        <div className="results-match-card">
            <div className="results-match-top">
                <div className="results-match-identity">
                    <div className="results-match-tags">
                        <span className="results-match-category">
                            {formatCategory(match)}
                        </span>
                        <span className="results-match-stage">
                            {formatStage(match)}
                        </span>
                        <span className={`results-status-badge results-status-${status.toLowerCase()}`}>
                            {statusLabel}
                        </span>
                    </div>

                    <div className="results-match-teams">
                        <div className="results-team results-team-home">
                            <span className="results-team-side">HOME</span>
                            <span className="results-team-name">
                                {match.home_team_name || 'Home Team'}
                            </span>
                        </div>
                        <span className="results-vs">VS</span>
                        <div className="results-team results-team-away">
                            <span className="results-team-side">AWAY</span>
                            <span className="results-team-name">
                                {match.away_team_name || 'Away Team'}
                            </span>
                        </div>
                    </div>

                    <div className="results-match-meta">
                        {match.match_date && (
                            <span>
                                <strong>Date</strong>
                                {match.match_date}
                            </span>
                        )}

                        {match.kickoff_time && (
                            <span>
                                <strong>Kickoff</strong>
                                {match.kickoff_time}
                            </span>
                        )}

                        {match.venue && (
                            <span>
                                <strong>Venue</strong>
                                {match.venue}
                            </span>
                        )}
                    </div>
                </div>

                <div className="results-match-controls">
                    <div className="results-control-group">
                        <div className="results-control-title">
                            <label htmlFor={`status-${match.id}`}>
                                Match status
                            </label>
                            <button
                                type="button"
                                className="results-small-button"
                                onClick={handleSaveStatus}
                                disabled={savingStatus}
                            >
                                {savingStatus ? 'Saving...' : 'Update'}
                            </button>
                        </div>
                        <select
                            id={`status-${match.id}`}
                            value={status}
                            onChange={(event) => setStatus(event.target.value)}
                        >
                            {MATCH_STATUS_OPTIONS.map((option) => (
                                <option
                                    key={option.value}
                                    value={option.value}
                                    disabled={isFinished && option.value !== 'FINISHED'}
                                >
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="results-control-group">
                        <div className="results-control-title">
                            <label htmlFor={`period-${match.id}`}>
                                Playing period
                            </label>
                            <button
                                type="button"
                                className="results-small-button"
                                onClick={handleSavePeriod}
                                disabled={savingPeriod}
                            >
                                {savingPeriod ? 'Saving...' : 'Update'}
                            </button>
                        </div>
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
                    </div>
                </div>
            </div>

            <div className="results-score-section">
                <div className="results-score-heading">
                    <div>
                        <span>Match result</span>
                        <small>Enter the official score for each team.</small>
                    </div>
                    <span className="results-score-heading-note">FULL TIME SCORE</span>
                </div>

                <div className="results-score-inputs">
                    <div className="results-score-team">
                        <label>
                            {match.home_team_name || 'Home Team'}
                        </label>

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
                        <label>
                            {match.away_team_name || 'Away Team'}
                        </label>

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
                                    onChange={(event) =>
                                        setHomePenalties(event.target.value)
                                    }
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
                                    onChange={(event) =>
                                        setAwayPenalties(event.target.value)
                                    }
                                    placeholder="0"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {isFinished && (
                    <label className="results-correction-reason">
                        Reason for score correction
                        <input
                            type="text"
                            value={correctionReason}
                            onChange={(event) => setCorrectionReason(event.target.value)}
                            placeholder="Explain why this finished result is being corrected"
                            maxLength={500}
                        />
                    </label>
                )}

                {isFinished && (
                    <div className="results-reopen-panel">
                        {reopenFormOpen ? (
                            <>
                                <label className="results-correction-reason">
                                    Reason for reopening
                                    <input
                                        type="text"
                                        value={reopenReason}
                                        onChange={(event) => setReopenReason(event.target.value)}
                                        placeholder="For example: match was marked finished by mistake"
                                        maxLength={500}
                                    />
                                </label>
                                <button
                                    type="button"
                                    className="results-reopen-button"
                                    onClick={handleReopenMatch}
                                    disabled={reopening}
                                >
                                    {reopening ? 'Reopening...' : 'Confirm Reopen'}
                                </button>
                                <button
                                    type="button"
                                    className="results-reopen-cancel"
                                    onClick={() => {
                                        setReopenFormOpen(false);
                                        setReopenReason('');
                                    }}
                                    disabled={reopening}
                                >
                                    Cancel
                                </button>
                            </>
                        ) : (
                            <button
                                type="button"
                                className="results-reopen-button"
                                onClick={() => setReopenFormOpen(true)}
                            >
                                Reopen Match
                            </button>
                        )}
                    </div>
                )}

                {message && (
                    <div className="results-feedback" role="status" aria-live="polite">
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
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);

    const loadMatches = async () => {
        try {
            setError('');

            const response = await callAdminApi('admin.matches.list', {});

            const matchList = Array.isArray(response)
                ? response
                : response?.matches || response?.data || [];

            setMatches(matchList);
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

    const availableCategoryValues = new Set(matches.map(getMatchCategory).filter(Boolean));
    const categories = [
        ...PUBLIC_CATEGORIES.filter(({ value }) => availableCategoryValues.has(value)),
        ...[...availableCategoryValues]
            .filter(value => !PUBLIC_CATEGORIES.some(category => category.value === value))
            .sort()
            .map(value => ({ value, label: getCompetitionCategoryLabel(value) }))
    ];
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const filteredMatches = matches.filter((match) => {
        const status = getMatchStatus(match);
        const matchesCategory =
            categoryFilter === 'all' || getMatchCategory(match) === categoryFilter;
        const matchesStatus =
            statusFilter === 'all' ||
            (statusFilter === 'upcoming' && ['PENDING', 'SCHEDULED', 'POSTPONED'].includes(status)) ||
            (statusFilter === 'live' && status === 'LIVE') ||
            (statusFilter === 'finished' && status === 'FINISHED') ||
            (statusFilter === 'other' && !['PENDING', 'SCHEDULED', 'POSTPONED', 'LIVE', 'FINISHED'].includes(status));
        const searchableText = [
            match.home_team_name,
            match.away_team_name,
            formatCategory(match),
            formatStage(match),
            match.venue,
        ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();

        return matchesCategory && matchesStatus && searchableText.includes(normalizedSearch);
    });
    const liveCount = matches.filter((match) => getMatchStatus(match) === 'LIVE').length;
    const scheduledCount = matches.filter((match) =>
        ['PENDING', 'SCHEDULED'].includes(getMatchStatus(match))
    ).length;
    const finishedCount = matches.filter((match) => getMatchStatus(match) === 'FINISHED').length;
    const pageCount = Math.max(1, Math.ceil(filteredMatches.length / MATCHES_PER_PAGE));
    const visiblePage = Math.min(currentPage, pageCount);
    const visibleMatches = filteredMatches.slice(
        (visiblePage - 1) * MATCHES_PER_PAGE,
        visiblePage * MATCHES_PER_PAGE
    );

    if (loading) {
        return (
            <div className="results-editor-page">
                <div className="results-editor-loading">
                    <span className="results-loading-spinner" aria-hidden="true" />
                    <span>Loading your matches...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="results-editor-page">
            <div className="results-editor-header">
                <div className="results-editor-heading">
                    <span className="results-editor-eyebrow">Matchday operations</span>
                    <h1>Results Editor</h1>
                    <p>
                        Update scores, match status and playing period from one place.
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
                <div className="results-editor-error" role="alert">
                    <span aria-hidden="true">!</span>
                    {error}
                </div>
            )}

            <div className="results-editor-summary">
                <div className="results-summary-card">
                    <span className="results-summary-mark" aria-hidden="true">01</span>
                    <div>
                        <strong>{matches.length}</strong>
                        <span>Total matches</span>
                    </div>
                </div>
                <div className="results-summary-card">
                    <span className="results-summary-mark results-summary-mark-live" aria-hidden="true">02</span>
                    <div>
                        <strong>{liveCount}</strong>
                        <span>Live now</span>
                    </div>
                </div>
                <div className="results-summary-card">
                    <span className="results-summary-mark" aria-hidden="true">03</span>
                    <div>
                        <strong>{finishedCount}</strong>
                        <span>Finished</span>
                    </div>
                </div>
                <div className="results-summary-card">
                    <span className="results-summary-mark" aria-hidden="true">04</span>
                    <div>
                        <strong>{scheduledCount}</strong>
                        <span>Upcoming</span>
                    </div>
                </div>
            </div>

            {matches.length > 0 && (
                <div className="results-editor-toolbar">
                    <label className="results-search-field">
                        <span className="results-visually-hidden">Search matches</span>
                        <span className="results-search-icon" aria-hidden="true" />
                        <input
                            type="search"
                            value={searchTerm}
                            onChange={(event) => {
                                setSearchTerm(event.target.value);
                                setCurrentPage(1);
                            }}
                            placeholder="Search teams or venues"
                        />
                    </label>
                    <label className="results-category-filter">
                        <span>Category</span>
                        <select
                            value={categoryFilter}
                            onChange={(event) => {
                                setCategoryFilter(event.target.value);
                                setCurrentPage(1);
                            }}
                        >
                            <option value="all">All categories</option>
                            {categories.map((category) => (
                                <option key={category.value} value={category.value}>
                                    {category.label}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="results-category-filter results-status-filter">
                        <span>Match status</span>
                        <select
                            value={statusFilter}
                            onChange={(event) => {
                                setStatusFilter(event.target.value);
                                setCurrentPage(1);
                            }}
                        >
                            <option value="all">All matches</option>
                            <option value="upcoming">Upcoming</option>
                            <option value="live">Live</option>
                            <option value="finished">Finished</option>
                            <option value="other">Other statuses</option>
                        </select>
                    </label>
                    <span className="results-match-count">
                        Showing {filteredMatches.length} of {matches.length}
                    </span>
                </div>
            )}

            {matches.length === 0 ? (
                <div className="results-editor-empty">
                    <span className="results-empty-mark" aria-hidden="true">✓</span>
                    <h3>No Matches Available</h3>
                    <p>
                        There are currently no matches available for result entry.
                    </p>
                </div>
            ) : filteredMatches.length === 0 ? (
                <div className="results-editor-empty">
                    <h3>No matches found</h3>
                    <p>Try a different team name, venue or category.</p>
                </div>
            ) : (
                <div className="results-match-list">
                    {visibleMatches.map((match) => (
                        <MatchRow
                            key={match.id}
                            match={match}
                            onUpdated={loadMatches}
                        />
                    ))}
                </div>
            )}

            {filteredMatches.length > MATCHES_PER_PAGE && (
                <nav className="results-editor-pagination" aria-label="Match list pages">
                    <button
                        type="button"
                        onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                        disabled={visiblePage === 1}
                    >
                        Previous
                    </button>
                    <span>Page {visiblePage} of {pageCount}</span>
                    <button
                        type="button"
                        onClick={() => setCurrentPage(page => Math.min(pageCount, page + 1))}
                        disabled={visiblePage === pageCount}
                    >
                        Next
                    </button>
                </nav>
            )}
        </div>
    );
}