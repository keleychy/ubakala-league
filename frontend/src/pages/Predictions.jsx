import React, { useCallback, useEffect, useMemo, useState } from 'react';
import './Predictions.css';
import { predictionsApi } from '../api/predictionsApi';

const OUTCOMES = [
  { value: '1', label: 'Home win' },
  { value: 'X', label: 'Draw' },
  { value: '2', label: 'Away win' }
];

const HISTORY_FILTERS = [
  ['all', 'All'],
  ['upcoming', 'Upcoming'],
  ['pending', 'Pending settlement'],
  ['correct', 'Correct'],
  ['incorrect', 'Incorrect'],
  ['void', 'Void']
];

function formatKickoff(date, time) {
  if (!date) return 'Date to be confirmed';
  const parsed = new Date(`${date}T${time || '00:00'}:00+01:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: time ? 'short' : undefined,
    timeZone: 'Africa/Lagos'
  }).format(parsed);
}

function outcomeLabel(value) {
  return OUTCOMES.find(outcome => outcome.value === value)?.label || value || '—';
}

function predictionHistoryStatus(prediction) {
  if (prediction.settlement_status === 'VOID') return 'void';
  if (prediction.settlement_status === 'SETTLED') {
    return prediction.selected_outcome === prediction.official_result ? 'correct' : 'incorrect';
  }
  const kickoff = new Date(`${prediction.match_date}T${prediction.kickoff_time || '00:00'}:00+01:00`);
  if (!Number.isNaN(kickoff.getTime()) && kickoff.getTime() > Date.now()) return 'upcoming';
  return 'pending';
}

function ResultsNotice({ error, success }) {
  return (
    <>
      {error && <div className="predictions-notice predictions-notice--error" role="alert">{error}</div>}
      {success && <div className="predictions-notice predictions-notice--success" role="status">{success}</div>}
    </>
  );
}

export default function Predictions() {
  const [configuration, setConfiguration] = useState(null);
  const [fixtures, setFixtures] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [selectedSeason, setSelectedSeason] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedOutcomes, setSelectedOutcomes] = useState({});
  const [confirmationId, setConfirmationId] = useState('');
  const [activeSection, setActiveSection] = useState('make');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [registration, setRegistration] = useState({
    first_name: '',
    surname: '',
    third_name: '',
    phone: ''
  });
  const [newCredentials, setNewCredentials] = useState(null);
  const [credentials, setCredentials] = useState({ predictor_id: '', access_code: '' });
  const [predictor, setPredictor] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyFilter, setHistoryFilter] = useState('all');

  const availableCategories = useMemo(() => {
    if (!configuration) return [];
    return [...new Set(configuration.seasons.map(season => season.category).filter(Boolean))];
  }, [configuration]);

  const loadPublicData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const config = await predictionsApi.getConfiguration();
      setConfiguration(config);
      if (!config.enabled) {
        setFixtures([]);
        setLeaderboard([]);
        setStatistics(null);
        return;
      }
      const [nextFixtures, nextLeaderboard, nextStatistics] = await Promise.all([
        predictionsApi.getFixtures(),
        config.leaderboard_enabled
          ? predictionsApi.getLeaderboard({
              season_id: selectedSeason,
              category: selectedCategory
            })
          : Promise.resolve([]),
        config.statistics_enabled
          ? predictionsApi.getStatistics({
              season_id: selectedSeason,
              category: selectedCategory
            })
          : Promise.resolve(null)
      ]);
      setFixtures(nextFixtures || []);
      setLeaderboard(nextLeaderboard || []);
      setStatistics(nextStatistics);
    } catch (loadError) {
      setError(loadError.message || 'Unable to load Predictions Centre data.');
    } finally {
      setLoading(false);
    }
  }, [selectedSeason, selectedCategory]);

  useEffect(() => {
    loadPublicData();
  }, [loadPublicData]);

  const refreshHistory = useCallback(async nextCredentials => {
    const data = await predictionsApi.getHistory(nextCredentials);
    setPredictor(data.predictor);
    setHistory(data.predictions || []);
    const existing = {};
    (data.predictions || []).forEach(item => {
      existing[item.fixture_id] = item.selected_outcome;
    });
    setSelectedOutcomes(previous => ({ ...existing, ...previous }));
  }, []);

  const handleAccess = async event => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await refreshHistory(credentials);
      setSuccess('Your predictions have been loaded.');
      setRegistrationOpen(false);
    } catch (accessError) {
      setError(accessError.message || 'Could not access those predictions.');
    } finally {
      setBusy(false);
    }
  };

  const handleRegister = async event => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const result = await predictionsApi.register(registration);
      const issuedCredentials = {
        predictor_id: result.predictor_id,
        access_code: result.access_code
      };
      setNewCredentials(result);
      setCredentials(issuedCredentials);
      setPredictor({ predictor_id: result.predictor_id, display_name: result.display_name });
      setHistory([]);
      setSuccess('Registration completed successfully. Save your Predictor ID and private access code.');
      setRegistrationOpen(false);
    } catch (registrationError) {
      setError(registrationError.message || 'Registration could not be completed.');
    } finally {
      setBusy(false);
    }
  };

  const handleSubmitPrediction = async fixture => {
    const selected = selectedOutcomes[fixture.id];
    if (!selected) {
      setError('Choose 1, X, or 2 before reviewing your prediction.');
      return;
    }
    if (!predictor) {
      setError('Access your Predictor ID before submitting a prediction.');
      setActiveSection('my');
      return;
    }
    if (confirmationId !== fixture.id) {
      setConfirmationId(fixture.id);
      setError('');
      setSuccess('');
      return;
    }
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const result = await predictionsApi.submit({
        ...credentials,
        fixture_id: fixture.id,
        selected_outcome: selected
      });
      setSuccess(result.updated
        ? 'Your prediction was updated successfully.'
        : 'Your prediction was submitted successfully.');
      setConfirmationId('');
      await Promise.all([refreshHistory(credentials), loadPublicData()]);
    } catch (submitError) {
      setError(submitError.message || 'We could not save your prediction. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const filteredHistory = useMemo(() => history.filter(item =>
    historyFilter === 'all' || predictionHistoryStatus(item) === historyFilter
  ), [history, historyFilter]);

  const setFilter = (setter, field, value) => {
    setter(value);
    if (field === 'season') setSelectedCategory('');
  };

  if (loading && !configuration) {
    return <main className="predictions-page"><div className="predictions-content"><p role="status">Loading Predictions Centre...</p></div></main>;
  }

  return (
    <main className="predictions-page">
      <div className="predictions-content">
        <header className="predictions-hero">
          <div className="predictions-eyebrow">Community football predictions</div>
          <h1>Ubakala Unity Cup Predictions Centre</h1>
          <p>Free, non-monetary 1X2 predictions. Follow the competition, make your calls, and see how you rank.</p>
        </header>

        <ResultsNotice error={error} success={success} />

        {configuration && !configuration.enabled ? (
          <div className="predictions-panel"><h2>Predictions are temporarily unavailable</h2></div>
        ) : (
          <>
            <section className="predictions-panel predictions-access" aria-label="Predictor access">
              <div>
                <h2>{predictor ? `Welcome, ${predictor.display_name}` : 'Your Predictor ID'}</h2>
                <p>Use your Predictor ID and private access code to view your history and update predictions before kickoff.</p>
              </div>
              {predictor && (
                <div className="predictions-id-badge">
                  <span>Predictor ID</span>
                  <strong>{predictor.predictor_id}</strong>
                </div>
              )}
              {newCredentials && (
                <div className="predictions-code-notice" role="alert">
                  <strong>Save your private access code now. It is shown only once.</strong>
                  <span>{newCredentials.access_code}</span>
                </div>
              )}
              <div className="predictions-access-actions">
                <button type="button" className="predictions-button predictions-button--secondary" onClick={() => setActiveSection('my')}>
                  Access my predictions
                </button>
                {configuration?.registration_enabled && (
                  <button type="button" className="predictions-button predictions-button--secondary" onClick={() => setRegistrationOpen(value => !value)}>
                    {registrationOpen ? 'Close registration' : 'Register'}
                  </button>
                )}
              </div>
              {activeSection === 'my' && !predictor && !registrationOpen && (
                <form className="predictions-inline-form" onSubmit={handleAccess}>
                  <label>
                    Predictor ID
                    <input
                      autoComplete="username"
                      value={credentials.predictor_id}
                      onChange={event => setCredentials(value => ({ ...value, predictor_id: event.target.value.toUpperCase() }))}
                      required
                    />
                  </label>
                  <label>
                    Private access code
                    <input
                      autoComplete="current-password"
                      value={credentials.access_code}
                      onChange={event => setCredentials(value => ({ ...value, access_code: event.target.value.toUpperCase() }))}
                      required
                    />
                  </label>
                  <button className="predictions-button" disabled={busy}>Load my predictions</button>
                  <small>Lost your access code? Contact a competition administrator to reset it securely.</small>
                </form>
              )}
              {registrationOpen && (
                <form className="predictions-inline-form" onSubmit={handleRegister}>
                  <label>First name<input value={registration.first_name} onChange={event => setRegistration(value => ({ ...value, first_name: event.target.value }))} required maxLength={80} /></label>
                  <label>Surname<input value={registration.surname} onChange={event => setRegistration(value => ({ ...value, surname: event.target.value }))} required maxLength={80} /></label>
                  <label>Third name (optional)<input value={registration.third_name} onChange={event => setRegistration(value => ({ ...value, third_name: event.target.value }))} maxLength={80} /></label>
                  <label>Mobile phone number<input type="tel" autoComplete="tel" value={registration.phone} onChange={event => setRegistration(value => ({ ...value, phone: event.target.value }))} required /></label>
                  <p className="predictions-privacy-note">Your phone number is kept private. The access code is not a password reset service; keep it safe.</p>
                  <button className="predictions-button" disabled={busy}>Create Predictor ID</button>
                </form>
              )}
            </section>

            <nav className="predictions-tabs" aria-label="Predictions sections">
              {[
                ['make', 'Make Predictions'],
                ['my', 'My Predictions'],
                ['leaderboard', 'Leaderboard'],
                ['statistics', 'Statistics']
              ].map(([id, label]) => (
                <button type="button" key={id} className={activeSection === id ? 'is-active' : ''} aria-pressed={activeSection === id} onClick={() => setActiveSection(id)}>
                  {label}
                </button>
              ))}
            </nav>

            {activeSection === 'make' && (
              <section className="predictions-section" aria-label="Make Predictions">
                <div className="predictions-section-heading">
                  <div><span className="predictions-eyebrow">Upcoming fixtures</span><h2>Make Predictions</h2></div>
                  <button type="button" className="predictions-button predictions-button--secondary" onClick={loadPublicData} disabled={loading}>Refresh fixtures</button>
                </div>
                {!fixtures.length ? (
                  <div className="predictions-empty">There are no eligible upcoming fixtures right now.</div>
                ) : (
                  <div className="predictions-fixture-grid">
                    {fixtures.map(fixture => (
                      <article className="predictions-fixture-card" key={fixture.id}>
                        <div className="predictions-fixture-meta">
                          <span>{fixture.season_name} · {fixture.stage || 'Fixture'}</span>
                          <span>{formatKickoff(fixture.match_date, fixture.kickoff_time)} WAT</span>
                        </div>
                        <div className="predictions-teams">
                          <strong>{fixture.home_team_name}</strong>
                          <span>vs</span>
                          <strong>{fixture.away_team_name}</strong>
                        </div>
                        {fixture.venue && <p className="predictions-venue">{fixture.venue}</p>}
                        <div className="predictions-outcomes" role="group" aria-label={`Predict ${fixture.home_team_name} versus ${fixture.away_team_name}`}>
                          {OUTCOMES.map(option => (
                            <button
                              type="button"
                              key={option.value}
                              aria-pressed={selectedOutcomes[fixture.id] === option.value}
                              className={selectedOutcomes[fixture.id] === option.value ? 'is-selected' : ''}
                              onClick={() => {
                                setSelectedOutcomes(current => ({ ...current, [fixture.id]: option.value }));
                                setConfirmationId('');
                              }}
                            >
                              <b>{option.value}</b><span>{option.label}</span>
                            </button>
                          ))}
                        </div>
                        {confirmationId === fixture.id && (
                          <div className="predictions-confirmation" role="region" aria-label="Prediction confirmation">
                            <p><strong>Confirm prediction:</strong> {predictor?.display_name || 'Predictor'} ({predictor?.predictor_id})</p>
                            <p>{fixture.home_team_name} vs {fixture.away_team_name}: <strong>{selectedOutcomes[fixture.id]} - {outcomeLabel(selectedOutcomes[fixture.id])}</strong></p>
                            <button type="button" className="predictions-button" disabled={busy} onClick={() => handleSubmitPrediction(fixture)}>Confirm and submit</button>
                            <button type="button" className="predictions-text-button" onClick={() => setConfirmationId('')}>Cancel</button>
                          </div>
                        )}
                        {confirmationId !== fixture.id && (
                          <button
                            type="button"
                            className="predictions-button predictions-submit"
                            disabled={busy || !selectedOutcomes[fixture.id]}
                            onClick={() => handleSubmitPrediction(fixture)}
                          >
                            {history.some(item => item.fixture_id === fixture.id) ? 'Review / update prediction' : 'Review prediction'}
                          </button>
                        )}
                      </article>
                    ))}
                  </div>
                )}
              </section>
            )}

            {activeSection === 'my' && (
              <section className="predictions-section">
                <div className="predictions-section-heading"><div><span className="predictions-eyebrow">Private history</span><h2>My Predictions</h2></div></div>
                {!predictor ? (
                  <div className="predictions-empty">Enter your Predictor ID and access code above to view your own predictions.</div>
                ) : (
                  <>
                    <div className="predictions-filter-row" role="group" aria-label="Filter my predictions">
                      {HISTORY_FILTERS.map(([value, label]) => (
                        <button type="button" key={value} className={historyFilter === value ? 'is-active' : ''} aria-pressed={historyFilter === value} onClick={() => setHistoryFilter(value)}>{label}</button>
                      ))}
                    </div>
                    {!filteredHistory.length ? (
                      <div className="predictions-empty">No predictions match this filter.</div>
                    ) : (
                      <div className="predictions-history-list">
                        {filteredHistory.map(item => (
                          <article className="predictions-history-card" key={item.prediction_id}>
                            <div><strong>{item.home_team_name} vs {item.away_team_name}</strong><span>{formatKickoff(item.match_date, item.kickoff_time)} WAT · {item.stage}</span></div>
                            <div><span>Your pick</span><strong>{item.selected_outcome} - {outcomeLabel(item.selected_outcome)}</strong></div>
                            <div><span>Official result</span><strong>{item.official_result ? `${item.official_result} - ${outcomeLabel(item.official_result)}` : item.settlement_status === 'VOID' ? 'Void' : 'Pending'}</strong></div>
                            <div><span>Points</span><strong>{item.points_awarded ?? '—'}</strong></div>
                          </article>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </section>
            )}

            {(activeSection === 'leaderboard' || activeSection === 'statistics') && (
              <div className="predictions-filter-bar">
                <label>
                  Season
                  <select value={selectedSeason} onChange={event => setFilter(setSelectedSeason, 'season', event.target.value)}>
                    <option value="">All current seasons</option>
                    {(configuration?.seasons || []).map(season => <option key={season.id} value={season.id}>{season.name}</option>)}
                  </select>
                </label>
                <label>
                  Category
                  <select value={selectedCategory} onChange={event => setSelectedCategory(event.target.value)}>
                    <option value="">All categories</option>
                    {availableCategories.map(category => <option key={category} value={category}>{category.replace(/_/g, ' ')}</option>)}
                  </select>
                </label>
              </div>
            )}

            {activeSection === 'leaderboard' && (
              <section className="predictions-section">
                <div className="predictions-section-heading"><div><span className="predictions-eyebrow">Community rankings</span><h2>Leaderboard</h2></div></div>
                {!configuration?.leaderboard_enabled ? <div className="predictions-empty">The leaderboard is currently unavailable.</div> : !leaderboard.length ? <div className="predictions-empty">No settled predictions are on the leaderboard yet.</div> : (
                  <div className="predictions-table-wrap">
                    <table className="predictions-table">
                      <thead><tr><th>Rank</th><th>Predictor</th><th>Points</th><th>Predictions</th><th>Correct</th><th>Accuracy</th></tr></thead>
                      <tbody>{leaderboard.map(item => (
                        <tr key={item.predictor_id}>
                          <td>{item.rank}</td><td>{item.display_name}</td><td>{item.total_points}</td>
                          <td>{item.total_predictions}</td><td>{item.correct_predictions}</td><td>{item.accuracy_percentage}%</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                )}
              </section>
            )}

            {activeSection === 'statistics' && (
              <section className="predictions-section">
                <div className="predictions-section-heading"><div><span className="predictions-eyebrow">Live totals</span><h2>Statistics</h2></div></div>
                {!configuration?.statistics_enabled || !statistics ? <div className="predictions-empty">Prediction statistics are currently unavailable.</div> : (
                  <div className="predictions-stat-grid">
                    {[
                      ['Registered predictors', statistics.registered_predictors],
                      ['Predictions', statistics.total_predictions],
                      ['Correct', statistics.correct_predictions],
                      ['Incorrect', statistics.incorrect_predictions],
                      ['Pending', statistics.pending_predictions],
                      ['Void', statistics.void_predictions],
                      ['Accuracy', `${statistics.accuracy_percentage}%`],
                      ['Most selected', statistics.most_selected_outcome || '—']
                    ].map(([label, value]) => <div className="predictions-stat-card" key={label}><span>{label}</span><strong>{value}</strong></div>)}
                  </div>
                )}
              </section>
            )}
          </>
        )}
        <p className="predictions-footer-note">This is a free community prediction feature. No money, stakes, or prizes are wagered through this service.</p>
      </div>
    </main>
  );
}
