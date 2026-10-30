import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './LeaguePolish.css';

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
      axios.get(`https://ubakalaunitycup.onrender.com/api/seasons/?category=${category}`)
        .then(res => setSeasons(res.data))
        .catch(() => setSeasons([]));
    } else {
      setSeasons([]);
    }
  }, [category]);

  // Load groups when season changes
  useEffect(() => {
    if (season) {
      axios.get(`https://ubakalaunitycup.onrender.com/api/groups/?season=${season}`)
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
      const response = await axios.post('https://ubakalaunitycup.onrender.com/api/manual-team-group/', {
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
    <div className="league-polish-page">
      <main className="league-polish-content">
        <header className="league-page-header">
          <div className="league-page-header__copy">
            <div className="league-page-eyebrow">Team administration</div>
            <h1 className="league-page-title">Add a Team</h1>
            <p className="league-page-subtitle">Assign a team to its competition category, season and group.</p>
          </div>
        </header>

      <form onSubmit={handleSubmit} className="league-page-panel league-page-form">
        <label className="league-page-field">
          Team name
          <input value={teamName} onChange={e => setTeamName(e.target.value)} required />
        </label>

        <label className="league-page-field">
          Category
          <select value={category} onChange={e => setCategory(e.target.value)} required>
            <option value="">Select Category</option>
            {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </label>

        <label className="league-page-field">
          Season
          <select value={season} onChange={e => setSeason(e.target.value)} required>
            <option value="">Select Season</option>
            {seasons.length === 0 && <option value="">-- No seasons found --</option>}
            {seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>

        <label className="league-page-field">
          Group
          <select value={group} onChange={e => setGroup(e.target.value)} required>
            <option value="">Select Group</option>
            {groups.length === 0 && <option value="">-- No groups found --</option>}
            {groups.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
          </select>
        </label>

        <button type="submit">Add team to group</button>
      </form>
      {error && <div className="league-page-status league-page-status--error">{error}</div>}
      {result && <div className="league-page-status">Team added successfully.</div>}
      </main>
    </div>
  );
};

export default ManualTeamForm;
