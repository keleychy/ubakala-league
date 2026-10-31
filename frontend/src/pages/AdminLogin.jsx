import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './LeaguePolish.css';
import { callAdminApi } from '../api/adminApi';
import {
  sendAdminPasswordReset,
  signInAdmin,
  signOutAdmin
} from '../api/firebaseAuth';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const nav = useNavigate();

  async function handleLogin(event) {
    event.preventDefault();
    setError('');
    setResetSent(false);
    setIsLoading(true);

    try {
      await signInAdmin(email, password);
      const profile = await callAdminApi('admin.me');
      const role = String(profile?.role || '').toLowerCase().replace(/[\s_-]+/g, '');
      if (role === 'admin') {
        nav('/admin-dashboard');
      } else if (role === 'resultseditor') {
        nav('/results-editor');
      } else if (role === 'newsuser') {
        nav('/news-uploader');
      } else {
        await signOutAdmin();
        setError('This account is not authorized for administrator access.');
      }
    } catch (loginError) {
      await signOutAdmin().catch(() => {});
      setError(loginError.message || 'Unable to sign in. Check your email and password.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handlePasswordReset() {
    setError('');
    setResetSent(false);
    if (!email.trim()) {
      setError('Enter your administrator email address first.');
      return;
    }
    setIsLoading(true);
    try {
      await sendAdminPasswordReset(email);
      setResetSent(true);
    } catch (resetError) {
      setError(resetError.message || 'Unable to send password reset email.');
    } finally {
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
            Sign in with your administrator email
          </p>
        </div>

        <form onSubmit={handleLogin} className="league-page-form">
          {error && (
            <div className="league-page-status league-page-status--error">
              {error}
            </div>
          )}

          <label className="league-page-field">
            Email
            <input
              type="email"
              autoComplete="username"
              placeholder="Enter your administrator email"
              value={email}
              onChange={event => setEmail(event.target.value)}
              required
              disabled={isLoading}
            />
          </label>

          <label className="league-page-field">
            Password
            <input
              type="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              required
              disabled={isLoading}
            />
          </label>

          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Signing in...' : 'Login'}
          </button>
          <button
            type="button"
            className="league-button-secondary"
            onClick={handlePasswordReset}
            disabled={isLoading}
          >
            Send password reset email
          </button>
          {resetSent && (
            <div className="league-page-status">
              If the account exists, a password reset email has been sent.
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
