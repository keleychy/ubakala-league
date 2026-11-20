import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/api';
import { callAdminApi } from '../api/adminApi';
import './LeaguePolish.css';

export default function TeamProfilesAdmin() {
  const [teams, setTeams] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [description, setDescription] = useState('');
  const [history, setHistory] = useState('');
  const [community, setCommunity] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loadAttempt, setLoadAttempt] = useState(0);

  const selectedTeam = useMemo(
    () => teams.find(team => team.id === selectedId) || null,
    [teams, selectedId]
  );

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api.getTeams()
      .then(items => {
        if (!active) return;
        const sortedTeams = [...items].sort((first, second) =>
          first.name.localeCompare(second.name)
        );
        const nextSelectedId = sortedTeams[0]?.id || '';
        const nextSelectedTeam = sortedTeams.find(
          team => team.id === nextSelectedId
        );
        setTeams(sortedTeams);
        setSelectedId(nextSelectedId);
        setDescription(nextSelectedTeam?.profile_description || '');
        setHistory(nextSelectedTeam?.profile_history || '');
        setCommunity(nextSelectedTeam?.home_community || '');
      })
      .catch(loadError => {
        if (active) setError(loadError.message || 'Unable to load teams.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [loadAttempt]);

  const handleTeamChange = event => {
    const nextSelectedId = event.target.value;
    const nextSelectedTeam = teams.find(team => team.id === nextSelectedId);
    setSelectedId(nextSelectedId);
    setDescription(nextSelectedTeam?.profile_description || '');
    setHistory(nextSelectedTeam?.profile_history || '');
    setCommunity(nextSelectedTeam?.home_community || '');
    setMessage('');
  };
  const handleSubmit = async event => {
    event.preventDefault();
    if (!selectedTeam) return;

    setSaving(true);
    setError('');
    setMessage('');
    try {
      const updatedTeam = await callAdminApi('admin.teams.profile.update', {
        team_id: selectedTeam.id,
        profile_description: description,
        profile_history: history,
        home_community: community
      });
      setTeams(current => current.map(team =>
        team.id === updatedTeam.id ? updatedTeam : team
      ));
      setMessage('Team profile saved.');
    } catch (saveError) {
      setError(saveError.message || 'Unable to save this team profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="league-polish-page">
      <main className="league-polish-content">
        <header className="league-page-header">
          <div className="league-page-header__copy">
            <div className="league-page-eyebrow">Team administration</div>
            <h1 className="league-page-title">Team Profiles</h1>
            <p className="league-page-subtitle">
              Edit public team information shared across the team&apos;s categories.
            </p>
          </div>
        </header>

        {error && <div className="league-page-status league-page-status--error" role="alert">{error}</div>}
        {message && <div className="league-page-status" role="status">{message}</div>}

        {loading ? (
          <div className="league-page-empty" role="status">Loading teams…</div>
        ) : teams.length === 0 && !error ? (
          <div className="league-page-empty">No teams are available to edit.</div>
        ) : error && teams.length === 0 ? (
          <button type="button" onClick={() => setLoadAttempt(attempt => attempt + 1)}>
            Try again
          </button>
        ) : (
          <form className="league-page-panel league-page-form" onSubmit={handleSubmit}>
            <label className="league-page-field">
              Team
              <select
                value={selectedId}
                onChange={handleTeamChange}
                required
              >
                {teams.map(team => (
                  <option key={team.id} value={team.id}>{team.name}</option>
                ))}
              </select>
            </label>

            <label className="league-page-field">
              Short team description
              <textarea
                value={description}
                onChange={event => setDescription(event.target.value)}
                maxLength={600}
                rows={4}
                aria-describedby="team-description-count"
              />
              <span id="team-description-count">{description.length}/600 characters</span>
            </label>

            <label className="league-page-field">
              Team history and achievements
              <textarea
                value={history}
                onChange={event => setHistory(event.target.value)}
                maxLength={1500}
                rows={6}
                aria-describedby="team-history-count"
              />
              <span id="team-history-count">{history.length}/1500 characters</span>
            </label>

            <label className="league-page-field">
              Home community
              <input
                value={community}
                onChange={event => setCommunity(event.target.value)}
                maxLength={120}
              />
            </label>

            <div className="team-profile-admin-actions">
              <button type="submit" disabled={saving || !selectedTeam}>
                {saving ? 'Saving…' : 'Save team profile'}
              </button>
              {selectedTeam && (
                <Link to={`/teams/${encodeURIComponent(selectedTeam.id)}`}>
                  Preview public profile
                </Link>
              )}
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
