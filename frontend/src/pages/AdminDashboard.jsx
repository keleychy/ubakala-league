import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { callAdminApi } from '../api/adminApi';
import { signOutAdmin } from '../api/firebaseAuth';
import './LeaguePolish.css';

const SESSION_TIMEOUT = 15 * 60 * 1000;
const WARNING_TIMEOUT = 2 * 60 * 1000;

export default function AdminDashboard() {
  const nav = useNavigate();
  const [profile, setProfile] = useState(null);
  const [sessionWarning, setSessionWarning] = useState(false);
  const [error, setError] = useState('');
  const inactivityTimerRef = useRef(null);
  const warningTimerRef = useRef(null);

  useEffect(() => {
    let active = true;
    callAdminApi('admin.me')
      .then(data => {
        if (active) setProfile(data);
      })
      .catch(async authError => {
        if (!active) return;
        setError(authError.message || 'Unable to verify administrator access.');
        await signOutAdmin().catch(() => {});
        nav('/admin', { replace: true });
      });
    return () => {
      active = false;
    };
  }, [nav]);

  const handleLogout = useCallback(async () => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    await signOutAdmin();
    nav('/admin', { replace: true });
  }, [nav]);

  const handleLogoutWithError = () => {
    handleLogout().catch(logoutError => {
      setError(logoutError.message || 'Unable to end the administrator session.');
    });
  };

  useEffect(() => {
    const resetInactivityTimer = () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      setSessionWarning(false);
      inactivityTimerRef.current = setTimeout(() => {
        setSessionWarning(true);
        warningTimerRef.current = setTimeout(() => {
          handleLogout().catch(error => {
            setError(error.message || 'Unable to end the administrator session.');
          });
        }, WARNING_TIMEOUT);
      }, SESSION_TIMEOUT);
    };

    ['mousemove', 'keypress', 'scroll', 'click'].forEach(eventName => {
      window.addEventListener(eventName, resetInactivityTimer);
    });
    resetInactivityTimer();
    return () => {
      ['mousemove', 'keypress', 'scroll', 'click'].forEach(eventName => {
        window.removeEventListener(eventName, resetInactivityTimer);
      });
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    };
  }, [handleLogout]);

  const role = String(profile?.role || '').toLowerCase().replace(/[\s_-]+/g, '');
  const isAdmin = role === 'admin';
  const canEditResults = isAdmin || role === 'resultseditor';
  const canManageNews = isAdmin || role === 'newsuser';

  function extendSession() {
    setSessionWarning(false);
    window.dispatchEvent(new Event('mousemove'));
  }

  return (
    <div className="league-polish-page">
      <main className="league-polish-content">
        <header className="league-page-header league-dashboard-header">
          <div className="league-page-header__copy">
            <div className="league-page-eyebrow">Administration</div>
            <h1 className="league-page-title">Admin Dashboard</h1>
            <p className="league-page-subtitle">Manage site content, results and teams.</p>
          </div>
          <div className="league-dashboard-user">
            <div>
              <div style={{ fontWeight: 700 }}>{profile?.email || 'Verifying account...'}</div>
              <div style={{ color: 'rgba(235, 242, 251, .75)', fontSize: 12 }}>
                {profile?.role || ''}
              </div>
            </div>
            <button type="button" className="league-button-danger" onClick={handleLogoutWithError}>
              Logout
            </button>
          </div>
        </header>

        {error && (
          <div className="league-page-status league-page-status--error" role="alert">
            {error}
          </div>
        )}

        <div className="league-dashboard-grid">
          {canEditResults && (
            <Link to="/results-editor" className="league-dashboard-link">
              <div className="league-dashboard-card">
                <div>
                  <div className="league-dashboard-card__title">Results Editor</div>
                  <div className="league-dashboard-card__description">Update scores, periods and final results.</div>
                </div>
                <div style={{ marginTop: 16, color: 'var(--league-blue)', fontSize: 12, fontWeight: 700 }}>
                  Open results editor <span aria-hidden="true">→</span>
                </div>
              </div>
            </Link>
          )}

          {canManageNews && (
            <Link to="/news-uploader" className="league-dashboard-link">
              <div className="league-dashboard-card">
                <div>
                  <div className="league-dashboard-card__title">News Manager</div>
                  <div className="league-dashboard-card__description">Create, edit and publish announcements.</div>
                </div>
                <div style={{ marginTop: 16, color: 'var(--league-blue)', fontSize: 12, fontWeight: 700 }}>
                  Open news manager <span aria-hidden="true">→</span>
                </div>
              </div>
            </Link>
          )}

          {isAdmin && (
            <>
              <Link to="/upload-teams" className="league-dashboard-link">
                <div className="league-dashboard-card">
                  <div>
                    <div className="league-dashboard-card__title">Upload Teams</div>
                    <div className="league-dashboard-card__description">Import teams from the competition Excel format.</div>
                  </div>
                </div>
              </Link>

              <Link to="/add-team-manual" className="league-dashboard-link">
                <div className="league-dashboard-card">
                  <div>
                    <div className="league-dashboard-card__title">Add Team</div>
                    <div className="league-dashboard-card__description">Create and assign a team to a season group.</div>
                  </div>
                </div>
              </Link>

              <Link to="/group-manager" className="league-dashboard-link">
                <div className="league-dashboard-card">
                  <div>
                    <div className="league-dashboard-card__title">Group Manager</div>
                    <div className="league-dashboard-card__description">Move teams between competition groups.</div>
                  </div>
                </div>
              </Link>
            </>
          )}
        </div>
      </main>

      {sessionWarning && (
        <>
          <div className="league-session-overlay" />
          <section className="league-session-warning" role="alertdialog" aria-modal="true" aria-labelledby="session-warning-title">
            <h2 id="session-warning-title">Session Expiring Soon</h2>
            <p>Your session will end due to inactivity. Continue to stay signed in.</p>
            <div>
              <button type="button" onClick={extendSession}>Continue session</button>
              <button type="button" className="league-button-danger" onClick={handleLogoutWithError}>
                Logout
              </button>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
