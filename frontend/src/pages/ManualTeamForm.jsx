import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ManualTeamForm = () => {
  const [teamName, setTeamName] = useState('');
  const [category, setCategory] = useState('');
  const [season, setSeason] = useState('');
  const [group, setGroup] = useState('');
  const categories = [
    { label: 'Senior Boys', value: 'senior_boys' },
    { label: 'Girls', value: 'girls' },
    { label: 'Junior Boys', value: 'junior_boys' },
  ];
  const [seasons, setSeasons] = useState([]);
  const [groups, setGroups] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Load seasons when category changes
  useEffect(() => {
    if (category) {
      axios.get(`http://127.0.0.1:8000/api/seasons/?category=${category}`)
        .then(res => setSeasons(res.data))
        .catch(() => setSeasons([]));
    } else {
      setSeasons([]);
    }
  }, [category]);

  // Load groups when season changes
  useEffect(() => {
    if (season) {
      axios.get(`http://127.0.0.1:8000/api/groups/?season=${season}`)
        .then(res => setGroups(res.data))
        .catch(() => setGroups([]));
    } else {
      setGroups([]);
    }
  }, [season]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    try {
      const response = await axios.post('http://127.0.0.1:8000/api/manual-team-group/', {
        team_name: teamName,
        category,
        season_id: season,
        group_name: group,
      });
      setResult(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Error adding team');
    }
  };

  return (
    <div style={{ maxWidth: 500, margin: '2rem auto', padding: '2rem', border: '1px solid #ccc', borderRadius: 8 }}>
      <h2>Add Team to Group (Manual)</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 10 }}>
          <label>Team Name:</label><br />
          <input value={teamName} onChange={e => setTeamName(e.target.value)} required />
        </div>
        <div style={{ marginBottom: 10 }}>
          <label>Category:</label><br />
          <select value={category} onChange={e => setCategory(e.target.value)} required>
            <option value="">Select Category</option>
            {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 10 }}>
          <label>Season:</label><br />
          <select value={season} onChange={e => setSeason(e.target.value)} required>
            <option value="">Select Season</option>
            {seasons.length === 0 && <option value="">-- No seasons found --</option>}
            {seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 10 }}>
          <label>Group:</label><br />
          <select value={group} onChange={e => setGroup(e.target.value)} required>
            <option value="">Select Group</option>
            {groups.length === 0 && <option value="">-- No groups found --</option>}
            {groups.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
          </select>
        </div>
        <button type="submit">Add Team</button>
      </form>
      {error && <div style={{ color: 'red', marginTop: 10 }}>{error}</div>}
      {result && <div style={{ color: 'green', marginTop: 10 }}>Team added successfully!</div>}
    </div>
  );
};

export default ManualTeamForm;
