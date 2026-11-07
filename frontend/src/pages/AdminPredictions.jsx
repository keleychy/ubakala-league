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
  const [predictors, setPredictors] = useState([]);
  const [query, setQuery] = useState('');
  const [searchDone, setSearchDone] = useState(false);
  const [searching, setSearching] = useState(false);
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
      const result = await predictionsAdminApi.getSummary();
      setSummary(result);
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
                          <button type="button" disabled={busy} onClick={() => handleResetCode(predictor)}>Reset code</button>
                        </td>
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
