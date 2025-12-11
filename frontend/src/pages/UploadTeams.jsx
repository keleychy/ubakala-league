import React, { useState } from 'react';
import axios from 'axios';

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
      const response = await axios.post('http://127.0.0.1:8000/api/import-excel/', formData, {
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
    <div style={{ maxWidth: 500, margin: '2rem auto', padding: '2rem', border: '1px solid #ccc', borderRadius: 8 }}>
      <h2>Upload Teams Excel</h2>
      <form onSubmit={handleSubmit}>
        <input type="file" accept=".xlsx,.xls" onChange={handleFileChange} />
        <button type="submit" disabled={loading || !file} style={{ marginLeft: 10 }}>
          {loading ? 'Uploading...' : 'Upload'}
        </button>
      </form>
      {error && <div style={{ color: 'red', marginTop: 10 }}>{error}</div>}
      {results && (
        <div style={{ marginTop: 20 }}>
          <h4>Import Results:</h4>
          <ul>
            {results.map((r, i) => (
              <li key={i}>
                {r.team}: {r.status} {r.reason ? `(${r.reason})` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div style={{ marginTop: 20, fontSize: 14, color: '#555' }}>
        <strong>Excel columns required:</strong> Team Name, Category, Season, Group
      </div>
    </div>
  );
};

export default UploadTeams;
