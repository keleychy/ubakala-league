import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';

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
    <div>
      <h2>Group Manager</h2>
      <div>
        <label>Season ID: </label>
        <input
          type="number"
          value={seasonId}
          onChange={(e) => setSeasonId(e.target.value)}
          style={{ width: 80 }}
        />
        <button onClick={fetchGroups} disabled={loading}>Refresh</button>
      </div>

      {message && <div style={{ marginTop: 8 }}>{message}</div>}

      <div style={{ display: 'flex', gap: 16, marginTop: 16 }}>
        {groups.map((g) => (
          <div
            key={g.id}
            onDragOver={onDragOver}
            onDragEnter={(e) => onDragEnter(e, g.id)}
            onDragLeave={onDragLeave}
            onDrop={(e) => { setDragOverGroup(null); onDrop(e, g.id); }}
            style={{
              border: '1px solid #ccc',
              padding: 8,
              minWidth: 160,
              minHeight: 80,
              background: dragOverGroup === g.id ? '#e6f7ff' : 'transparent',
            }}
          >
            <h4>{g.name}</h4>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {g.teams.map((t) => (
                <li
                  key={t.id}
                  draggable
                  onDragStart={(e) => onDragStart(e, t, g.id)}
                  style={{ padding: '6px 8px', border: '1px solid #eee', marginBottom: 6, cursor: 'grab', background: '#fafafa' }}
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
            <div>
              <label style={{ fontSize: 12, color: '#666' }}>Or select this group as target</label>
              <div>
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
        <button onClick={handleMove} disabled={loading}>Move Selected Team</button>
      </div>
    </div>
  );
}
