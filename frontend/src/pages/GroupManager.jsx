import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import './LeaguePolish.css';

export default function GroupManager() {
  const [seasonId, setSeasonId] = useState(1);
  const [groups, setGroups] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [targetGroup, setTargetGroup] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [dragOverGroup, setDragOverGroup] = useState(null);

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/groups-with-teams/?season=${seasonId}`);
      setGroups(res.data);
    } catch (err) {
      console.error(err);
      setMessage('Failed to load groups');
    } finally {
      setLoading(false);
    }
  }, [seasonId]);

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
      await axios.post('/api/move-team/', {
        team_id: selectedTeam.id,
        to_group_id: targetGroup,
        season_id: seasonId,
      });
      setMessage('Team moved');
      setSelectedTeam(null);
      setTargetGroup(null);
      fetchGroups();
    } catch (err) {
      console.error(err);
      setMessage('Failed to move team');
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
      await axios.post('/api/move-team/', { team_id: teamId, to_group_id: toGroupId, season_id: seasonId });
      setMessage('Team moved');
    } catch (err) {
      console.error(err);
      setMessage('Failed to move team');
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
        <label className="league-page-field">Season ID
        <input
          type="number"
          value={seasonId}
          onChange={(e) => setSeasonId(e.target.value)}
          style={{ width: 130 }}
        />
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
