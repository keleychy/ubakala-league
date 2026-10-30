import React, { useState } from 'react';
import axios from 'axios';
import './LeaguePolish.css';

const UploadTeams = () => {
  const [file, setFile] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setError(null);
    setResults(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await axios.post('https://ubakalaunitycup.onrender.com/api/import-excel/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setResults(response.data.results);
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="league-polish-page">
      <main className="league-polish-content">
        <header className="league-page-header">
          <div className="league-page-header__copy">
            <div className="league-page-eyebrow">Team administration</div>
            <h1 className="league-page-title">Upload Teams</h1>
            <p className="league-page-subtitle">Import team records using the competition spreadsheet format.</p>
          </div>
        </header>
      <section className="league-page-panel">
      <form onSubmit={handleSubmit} className="league-page-form">
        <label className="league-page-field">
          Excel file
          <input className="league-upload-file" type="file" accept=".xlsx,.xls" onChange={handleFileChange} />
        </label>
        <button type="submit" disabled={loading || !file}>
          {loading ? 'Uploading...' : 'Upload'}
        </button>
      </form>
      {error && <div className="league-page-status league-page-status--error">{error}</div>}
      {results && (
        <div style={{ marginTop: 22 }}>
          <h2 style={{ margin: '0 0 12px', color: 'var(--league-navy)', fontSize: 17 }}>Import results</h2>
          <ul style={{ display: 'grid', gap: 8, paddingLeft: 20 }}>
            {results.map((r, i) => (
              <li key={i}>
                {r.team}: {r.status} {r.reason ? `(${r.reason})` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div style={{ marginTop: 22, padding: 14, borderRadius: 9, background: '#f5f8fc', color: 'var(--league-muted)', fontSize: 13, lineHeight: 1.6 }}>
        <strong>Excel columns required:</strong> Team Name, Category, Season, Group
      </div>
      </section>
      </main>
    </div>
  );
};

export default UploadTeams;
