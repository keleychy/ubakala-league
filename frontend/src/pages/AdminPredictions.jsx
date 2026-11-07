import React, { useCallback, useEffect, useState } from 'react';
import './Predictions.css';
import { predictionsAdminApi } from '../api/predictionsApi';

const SETTING_TITLES = {
  feature_enabled: 'Enable Predictions Centre',
  registration_enabled: 'Allow predictor registration',
  submissions_enabled: 'Allow prediction submissions',
  leaderboard_enabled: 'Show public leaderboard',
  statistics_enabled: 'Show public statistics',
  reopen_postponed_predictions: 'Allow admin-approved postponed fixture reopening'
};

export default function AdminPredictions() {
  const [summary, setSummary] = useState(null);
  const [overview, setOverview] = useState(null);
  const [auditHistory, setAuditHistory] = useState([]);
  const [predictors, setPredictors] = useState([]);
  const [predictorHistory, setPredictorHistory] = useState(null);
  const [query, setQuery] = useState('');
  const [searchDone, setSearchDone] = useState(false);
  const [searching, setSearching] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [initRequired, setInitRequired] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [newAccessCode, setNewAccessCode] = useState(null);
  const [pointsValue, setPointsValue] = useState('');

  const loadSummary = useCallback(async () => {
    setError('');
    try {
      const [result, overviewResult, auditResult] = await Promise.all([
        predictionsAdminApi.getSummary(),
        predictionsAdminApi.getOverview(),
        predictionsAdminApi.getAuditHistory()
      ]);
      setSummary(result);
      setOverview(overviewResult);
      setAuditHistory(auditResult || []);
      setPointsValue(result.settings.points_per_correct_prediction || '1');
      setInitRequired(false);
    } catch (loadError) {
      setSummary(null);
      setInitRequired(/not initialized|sheet/i.test(loadError.message || ''));
      setError(loadError.message || 'Could not load Predictions Centre administration.');
    }
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const handleInitialize = async () => {
    setInitializing(true);
    setError('');
    setMessage('');
    try {
      const result = await predictionsAdminApi.initialize();
      setMessage(`Predictions storage is ready. Verified tabs: ${result.sheets.join(', ')}. Maintenance runs every five minutes.`);
      await loadSummary();
    } catch (initializeError) {
      setError(initializeError.message || 'Could not initialize prediction storage.');
    } finally {
      setInitializing(false);
    }
  };

  const handleSearch = async event => {
    event.preventDefault();
    setSearching(true);
    setError('');
    try {
      const result = await predictionsAdminApi.searchPredictors(query.trim());
      setPredictors(result || []);
      setSearchDone(true);
    } catch (searchError) {
      setError(searchError.message || 'Could not search predictors.');
    } finally {
      setSearching(false);
    }
  };

  const handlePredictorHistory = async predictor => {
    setLoadingHistory(true);
    setError('');
    try {
      setPredictorHistory(
        await predictionsAdminApi.getPredictorHistory(predictor.predictor_id)
      );
    } catch (historyError) {
      setError(historyError.message || 'Could not load predictor history.');
    } finally {
      setLoadingHistory(false);
    }
  };

  const updateSetting = async (key, value) => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await predictionsAdminApi.setSetting(key, value);
      setMessage(`${SETTING_TITLES[key] || key} updated.`);
      await loadSummary();
    } catch (settingError) {
      setError(settingError.message || 'Could not update setting.');
    } finally {
      setBusy(false);
    }
  };

  const handleSettle = async () => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await predictionsAdminApi.settle();
      setMessage(`Settlement check complete. ${result.updated_settlements} result record(s) were added or corrected.`);
      await loadSummary();
    } catch (settlementError) {
      setError(settlementError.message || 'Could not settle predictions.');
    } finally {
      setBusy(false);
    }
  };

  const handleStatus = async (predictor, status) => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await predictionsAdminApi.setAccountStatus(predictor.predictor_id, status);
      setMessage(`${predictor.predictor_id} is now ${status.toLowerCase()}.`);
      await handleSearch({ preventDefault: () => {} });
      await loadSummary();
    } catch (statusError) {
      setError(statusError.message || 'Could not update predictor status.');
    } finally {
      setBusy(false);
    }
  };

  const handleResetCode = async predictor => {
    const reason = window.prompt(`Reason for resetting ${predictor.predictor_id}'s access code:`);
    if (!reason || !reason.trim()) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await predictionsAdminApi.resetAccessCode(predictor.predictor_id, reason.trim());
      setNewAccessCode(result);
      setMessage('Access code reset. Deliver the new code privately; it will be shown only once.');
    } catch (resetError) {
      setError(resetError.message || 'Could not reset the access code.');
    } finally {
      setBusy(false);
    }
  };

  const settings = summary?.settings || {};
  const currentSeasons = summary?.seasons || [];
  const outcomeLabel = outcome => ({
    '1': 'Home win',
    X: 'Draw',
    '2': 'Away win'
  }[outcome] || '—');

  return (
    <main className="predictions-page">
      <div className="predictions-content">
        <header className="predictions-hero">
          <div className="predictions-eyebrow">Administrator tools</div>
          <h1>Predictions Centre Management</h1>
          <p>Manage the community predictions service without changing official match results.</p>
        </header>
        {error && <div className="predictions-notice predictions-notice--error" role="alert">{error}</div>}
        {message && <div className="predictions-notice predictions-notice--success" role="status">{message}</div>}

        {initRequired && (
          <section className="predictions-panel">
            <h2>Initialize prediction storage</h2>
            <p>This creates any missing prediction tabs without clearing existing data, validates their required headers, and installs the five-minute lock/settlement maintenance trigger.</p>
            <button type="button" className="predictions-button" disabled={initializing} onClick={handleInitialize}>
              {initializing ? 'Preparing...' : 'Initialize / validate prediction tabs'}
            </button>
          </section>
        )}

        {summary && (
          <>
            <section className="predictions-panel">
              <div className="predictions-section-heading">
                <div><span className="predictions-eyebrow">Saved records</span><h2>Service overview</h2></div>
                <button type="button" className="predictions-button predictions-button--secondary" onClick={loadSummary}>Refresh</button>
              </div>
              <div className="predictions-stat-grid">
                {[
                  ['Registered predictors', summary.statistics.registered_predictors],
                  ['Predictions', summary.statistics.total_predictions],
                  ['Correct', summary.statistics.correct_predictions],
                  ['Pending settlement', summary.pending_settlements]
                ].map(([label, value]) => <div className="predictions-stat-card" key={label}><span>{label}</span><strong>{value}</strong></div>)}
              </div>
              <div className="predictions-admin-actions">
                <button type="button" className="predictions-button" disabled={busy} onClick={handleSettle}>Check and settle official results</button>
              </div>
            </section>

            <section className="predictions-panel">
              <span className="predictions-eyebrow">Fixture monitoring</span>
              <h2>Prediction activity by match</h2>
              {!overview?.fixtures?.length ? <p>No fixtures are available for monitoring.</p> : (
                <div className="predictions-table-wrap">
                  <table className="predictions-table">
                    <thead><tr><th>Match</th><th>Competition / stage</th><th>Kickoff</th><th>State</th><th>Predictions</th><th>1 / X / 2</th><th>Settled</th></tr></thead>
                    <tbody>{overview.fixtures.map(fixture => (
                      <tr key={fixture.fixture_id}>
                        <td>{fixture.home_team_name} vs {fixture.away_team_name}</td>
                        <td>{fixture.season_name}{fixture.stage ? ` · ${fixture.stage}` : ''}</td>
                        <td>{fixture.match_date} {fixture.kickoff_time}</td>
                        <td>{fixture.prediction_state.replace(/_/g, ' ')}</td>
                        <td>{fixture.total_predictions}</td>
                        <td>{fixture.outcome_counts['1']} / {fixture.outcome_counts.X} / {fixture.outcome_counts['2']}</td>
                        <td>{fixture.settled_predictions}/{fixture.total_predictions}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="predictions-panel">
              <div className="predictions-section-heading">
                <div><span className="predictions-eyebrow">Completed matches</span><h2>Pending settlements</h2></div>
                <span>{overview?.pending_settlements_total || 0} pending</span>
              </div>
              {!overview?.pending_settlements?.length ? <p>No completed matches are awaiting prediction settlement.</p> : (
                <div className="predictions-table-wrap">
                  <table className="predictions-table">
                    <thead><tr><th>Match</th><th>Date</th><th>Predictor ID</th><th>Pick</th><th>Official outcome</th><th>State</th></tr></thead>
                    <tbody>{overview.pending_settlements.map(item => (
                      <tr key={item.prediction_id}>
                        <td>{item.match}</td><td>{item.match_date}</td><td>{item.predictor_id}</td>
                        <td>{outcomeLabel(item.selected_outcome)}</td>
                        <td>{outcomeLabel(item.official_outcome)}</td>
                        <td>{item.issue}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                  {overview.pending_settlements_total > overview.pending_settlements.length &&
                    <p>Showing the first {overview.pending_settlements.length} of {overview.pending_settlements_total} pending records.</p>}
                </div>
              )}
            </section>

            <section className="predictions-panel">
              <span className="predictions-eyebrow">Public controls</span>
              <h2>Feature settings</h2>
              <div className="predictions-setting-list">
                {Object.entries(SETTING_TITLES).map(([key, title]) => (
                  <label className="predictions-setting" key={key}>
                    <span><strong>{title}</strong><small>{key === 'reopen_postponed_predictions' ? 'Use only after an authorized schedule change; reopening is otherwise disabled.' : 'Changes apply to public pages immediately.'}</small></span>
                    <input
                      type="checkbox"
                      checked={settings[key] === 'true'}
                      disabled={busy}
                      onChange={event => updateSetting(key, String(event.target.checked))}
                    />
                  </label>
                ))}
                <label className="predictions-setting predictions-setting--season">
                  <span><strong>Points per correct prediction</strong><small>Choose a whole number from 0 to 10.</small></span>
                  <span className="predictions-points-control">
                    <input type="number" min="0" max="10" step="1" value={pointsValue} disabled={busy} onChange={event => setPointsValue(event.target.value)} />
                    <button type="button" className="predictions-button predictions-button--secondary" disabled={busy || !/^(?:[0-9]|10)$/.test(pointsValue)} onClick={() => updateSetting('points_per_correct_prediction', pointsValue)}>Save</button>
                  </span>
                </label>
                <label className="predictions-setting predictions-setting--season">
                  <span><strong>Current season</strong><small>Blank uses all active, non-archived seasons.</small></span>
                  <select value={settings.current_season_id || ''} disabled={busy} onChange={event => updateSetting('current_season_id', event.target.value)}>
                    <option value="">All active seasons</option>
                    {currentSeasons.map(season => <option key={season.id} value={season.id}>{season.name}</option>)}
                  </select>
                </label>
              </div>
            </section>

            <section className="predictions-panel">
              <span className="predictions-eyebrow">Participant support</span>
              <h2>Find a predictor</h2>
              <form className="predictions-admin-search" onSubmit={handleSearch}>
                <input aria-label="Search predictor ID or name" value={query} onChange={event => setQuery(event.target.value)} placeholder="Predictor ID or participant name" />
                <button type="submit" className="predictions-button" disabled={searching}>{searching ? 'Searching...' : 'Search'}</button>
              </form>
              {newAccessCode && (
                <div className="predictions-code-notice" role="alert">
                  <strong>{newAccessCode.predictor_id}: deliver this new private code securely. It will not be shown again.</strong>
                  <span>{newAccessCode.access_code}</span>
                  <button type="button" className="predictions-text-button" onClick={() => setNewAccessCode(null)}>Dismiss</button>
                </div>
              )}
              {searchDone && !predictors.length && <div className="predictions-empty">No predictor records matched that search.</div>}
              {!!predictors.length && (
                <div className="predictions-table-wrap">
                  <table className="predictions-table">
                    <thead><tr><th>Predictor ID</th><th>Name</th><th>Status</th><th>Registration</th><th>Actions</th></tr></thead>
                    <tbody>{predictors.map(predictor => (
                      <tr key={predictor.predictor_id}>
                        <td>{predictor.predictor_id}</td><td>{predictor.display_name}</td><td>{predictor.account_status}</td>
                        <td>{predictor.registration_date ? new Date(predictor.registration_date).toLocaleDateString() : '—'}</td>
                        <td className="predictions-row-actions">
                          <button type="button" disabled={busy} onClick={() => handleStatus(predictor, predictor.account_status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE')}>
                            {predictor.account_status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
                          </button>
                          <button type="button" disabled={loadingHistory} onClick={() => handlePredictorHistory(predictor)}>View history</button>
                          <button type="button" disabled={busy} onClick={() => handleResetCode(predictor)}>Reset code</button>
                        </td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
              {predictorHistory && (
                <div className="predictions-admin-history">
                  <div className="predictions-section-heading">
                    <div><span className="predictions-eyebrow">Participant activity</span><h3>{predictorHistory.predictor.display_name} · {predictorHistory.predictor.predictor_id}</h3></div>
                    <button type="button" className="predictions-text-button" onClick={() => setPredictorHistory(null)}>Close</button>
                  </div>
                  {!predictorHistory.predictions.length ? <p>No predictions have been submitted.</p> : (
                    <div className="predictions-table-wrap">
                      <table className="predictions-table">
                        <thead><tr><th>Match</th><th>Date</th><th>Pick</th><th>Official result</th><th>Settlement</th><th>Points</th><th>Edits</th></tr></thead>
                        <tbody>{predictorHistory.predictions.map(item => (
                          <tr key={item.prediction_id}>
                            <td>{item.match}</td><td>{item.match_date}</td>
                            <td>{outcomeLabel(item.selected_outcome)}</td>
                            <td>{outcomeLabel(item.official_result)}</td>
                            <td>{item.settlement_status}</td><td>{item.points_awarded}</td><td>{item.revision_count}</td>
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </section>

            <section className="predictions-panel">
              <span className="predictions-eyebrow">Administrative controls</span>
              <h2>Prediction audit history</h2>
              {!auditHistory.length ? <p>No prediction-related audit entries are available.</p> : (
                <div className="predictions-table-wrap">
                  <table className="predictions-table">
                    <thead><tr><th>Time</th><th>Administrator</th><th>Action</th><th>Record</th><th>Reason</th><th>Change</th></tr></thead>
                    <tbody>{auditHistory.map((entry, index) => (
                      <tr key={`${entry.timestamp}-${entry.action}-${index}`}>
                        <td>{entry.timestamp}</td><td>{entry.user_email}</td>
                        <td>{entry.action}</td><td>{entry.entity_type} · {entry.entity_id}</td>
                        <td>{entry.reason || '—'}</td>
                        <td><details><summary>View</summary><pre>{entry.old_value || 'null'} → {entry.new_value || 'null'}</pre></details></td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="predictions-panel">
              <span className="predictions-eyebrow">Current rankings</span>
              <h2>Leaderboard preview</h2>
              {!summary.leaderboard.length ? <p>No settled predictions yet.</p> : (
                <div className="predictions-table-wrap">
                  <table className="predictions-table">
                    <thead><tr><th>Rank</th><th>Predictor</th><th>Points</th><th>Correct</th><th>Accuracy</th></tr></thead>
                    <tbody>{summary.leaderboard.slice(0, 10).map(item => (
                      <tr key={item.predictor_id}><td>{item.rank}</td><td>{item.display_name}</td><td>{item.total_points}</td><td>{item.correct_predictions}</td><td>{item.accuracy_percentage}%</td></tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
