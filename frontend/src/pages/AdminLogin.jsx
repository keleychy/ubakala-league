import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './LeaguePolish.css';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const nav = useNavigate();

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('https://ubakalaunitycup.onrender.com/api/token/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (!res.ok) {
        setError('Invalid username or password. Please try again.');
        setIsLoading(false);
        return;
      }

      const data = await res.json();
      localStorage.setItem('access', data.access);
      localStorage.setItem('refresh', data.refresh);
      localStorage.setItem('username', username); // Store username for dashboard display
      // fetch /me to discover groups/role
      try {
        const meRes = await fetch('https://ubakalaunitycup.onrender.com/api/me/', {
          headers: { 'Authorization': `Bearer ${data.access}` }
        });
        if (meRes.ok) {
          const me = await meRes.json();
          localStorage.setItem('groups', JSON.stringify(me.groups || []));
          // Redirect based on role/groups
          if (me.is_superuser) {
            nav('/admin-dashboard');
          } else if ((me.groups || []).includes('NewsUploader')) {
            nav('/news-uploader');
          } else if ((me.groups || []).includes('ResultsEditor')) {
            nav('/results-editor');
          } else {
            nav('/');
          }
        } else {
          // fallback to admin dashboard
          nav('/admin-dashboard');
        }
      } catch (err) {
        nav('/admin-dashboard');
      } finally {
        setIsLoading(false);
      }
    } catch (err) {
      setError('Connection error. Please check your server connection.');
      setIsLoading(false);
    }
  }

  return (
    <div className="league-polish-page league-login-page">
      <div className="league-login-card">
        <div className="league-login-card__intro">
          <div className="league-login-card__icon">🔐</div>
          <div className="league-page-eyebrow">UBAKALA UNITY CUP</div>
          <h1 className="league-page-title" style={{ color: 'var(--league-navy)', fontSize: 28 }}>
            Admin Login
          </h1>
          <p style={{ color: 'var(--league-muted)', fontSize: 14, margin: '8px 0 0' }}>
            Manage matches and results
          </p>
        </div>

        <form onSubmit={handleLogin} className="league-page-form">
          {error && (
            <div className="league-page-status league-page-status--error">
              {error}
            </div>
          )}

          <label className="league-page-field">
              Username
            <input
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              disabled={isLoading}
            />
          </label>

          <label className="league-page-field">
              Password
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={isLoading}
            />
          </label>

          <button
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? '⏳ Logging in...' : '🔑 Login'}
          </button>
        </form>

        {/* Demo account info removed */}
      </div>
    </div>
  );
}
