import React, { useEffect, useState, useCallback } from 'react';
import { callAdminApi } from '../api/adminApi';
import './LeaguePolish.css';

export default function GroupManager() {
  const [seasonId, setSeasonId] = useState('');
  const [seasons, setSeasons] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [targetGroup, setTargetGroup] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [dragOverGroup, setDragOverGroup] = useState(null);

  const fetchGroups = useCallback(async () => {
    if (!seasonId) {
      setGroups([]);
      return;
    }
    setLoading(true);
    try {
      const data = await callAdminApi('admin.groups.list', { season_id: seasonId });
      setGroups(data || []);
    } catch (error) {
      setMessage(error.message || 'Failed to load groups');
    } finally {
      setLoading(false);
    }
  }, [seasonId]);

  useEffect(() => {
    let active = true;
    callAdminApi('admin.seasons.list')
      .then(items => {
        if (!active) return;
        const available = items || [];
        setSeasons(available);
        const currentSeason = available.find(item => item.active && !item.archived) || available[0];
        setSeasonId(currentSeason ? currentSeason.id : '');
      })
      .catch(error => {
        if (active) setMessage(error.message || 'Failed to load seasons');
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const handleMove = async () => {
    if (!selectedTeam || !targetGroup) {
      setMessage('Select a team and a target group');
      return;
    }
    setLoading(true);
    try {
      await callAdminApi('admin.teams.move', {
        team_id: selectedTeam.id,
        to_group_id: targetGroup,
        season_id: seasonId,
      });
      setMessage('Team moved');
      setSelectedTeam(null);
      setTargetGroup(null);
      fetchGroups();
    } catch (error) {
      setMessage(error.message || 'Failed to move team');
    } finally {
      setLoading(false);
    }
  };

  // Drag and drop handlers (HTML5)
  const onDragStart = (e, team, fromGroupId) => {
    const payload = JSON.stringify({ teamId: team.id, fromGroupId });
    e.dataTransfer.setData('text/plain', payload);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const onDragEnter = (e, groupId) => {
    e.preventDefault();
    setDragOverGroup(groupId);
  };

  const onDragLeave = (e) => {
    e.preventDefault();
    setDragOverGroup(null);
  };

  const onDrop = async (e, toGroupId) => {
    e.preventDefault();
    try {
      const raw = e.dataTransfer.getData('text/plain');
      if (!raw) return;
      const { teamId, fromGroupId } = JSON.parse(raw);
      if (fromGroupId === toGroupId) return; // no-op

      // Optimistic UI update: move team locally first
      setGroups((prev) => {
        const copy = prev.map((g) => ({ ...g, teams: [...g.teams] }));
        const from = copy.find((g) => g.id === fromGroupId);
        const to = copy.find((g) => g.id === toGroupId);
        if (!from || !to) return prev;
        const idx = from.teams.findIndex((t) => t.id === teamId);
        if (idx === -1) return prev;
        const [team] = from.teams.splice(idx, 1);
        to.teams.push(team);
        return copy;
      });

      // Call backend to persist
      setLoading(true);
      await callAdminApi('admin.teams.move', {
        team_id: teamId,
        to_group_id: toGroupId,
        season_id: seasonId
      });
      setMessage('Team moved');
    } catch (error) {
      setMessage(error.message || 'Failed to move team');
      // On error, refresh from server to restore correct state
      fetchGroups();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="league-polish-page">
      <main className="league-polish-content">
        <header className="league-page-header">
          <div className="league-page-header__copy">
            <div className="league-page-eyebrow">Competition administration</div>
            <h1 className="league-page-title">Group Manager</h1>
            <p className="league-page-subtitle">Organize teams across competition groups.</p>
          </div>
        </header>

        <div className="league-manager-toolbar">
        <label className="league-page-field">Season
        <select
          value={seasonId}
          onChange={(e) => setSeasonId(e.target.value)}
          disabled={!seasons.length}
        >
          {!seasons.length && <option value="">No seasons found</option>}
          {seasons.map(season => (
            <option key={season.id} value={season.id}>
              {season.name} — {season.category}
            </option>
          ))}
        </select>
        </label>
        <button onClick={fetchGroups} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh groups'}</button>
        </div>

      {message && <div className={`league-page-status${message.includes('Failed') || message.includes('Select') ? ' league-page-status--error' : ''}`}>{message}</div>}
      {loading && groups.length === 0 && <div className="league-page-empty">Loading groups…</div>}
      {!loading && groups.length === 0 && <div className="league-page-empty">No groups found for this season.</div>}

      <div className="league-manager-groups">
        {groups.map((g) => (
          <div
            key={g.id}
            className="league-manager-group"
            onDragOver={onDragOver}
            onDragEnter={(e) => onDragEnter(e, g.id)}
            onDragLeave={onDragLeave}
            onDrop={(e) => { setDragOverGroup(null); onDrop(e, g.id); }}
            style={dragOverGroup === g.id ? { background: '#edf6ff', borderColor: '#7898bd' } : undefined}
          >
            <h2 style={{ margin: '0 0 14px', color: 'var(--league-navy)', fontSize: 17 }}>Group {g.name}</h2>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {g.teams.map((t) => (
                <li
                  key={t.id}
                  draggable
                  onDragStart={(e) => onDragStart(e, t, g.id)}
                  className="league-manager-team"
                >
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="radio"
                      name="selectedTeam"
                      checked={selectedTeam && selectedTeam.id === t.id}
                      onChange={() => setSelectedTeam(t)}
                    />
                    {t.name}
                  </label>
                </li>
              ))}
            </ul>
            <div style={{ borderTop: '1px solid var(--league-border)', paddingTop: 12 }}>
              <label style={{ fontSize: 12, color: 'var(--league-muted)' }}>Choose as destination group</label>
              <div style={{ marginTop: 6 }}>
                <input
                  type="radio"
                  name={`targetGroup`}
                  checked={targetGroup === g.id}
                  onChange={() => setTargetGroup(g.id)}
                />{' '}
                Select
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 16 }}>
        <button onClick={handleMove} disabled={loading}>
          {loading ? 'Saving…' : 'Move selected team'}
        </button>
      </div>
      </main>
    </div>
  );
}
